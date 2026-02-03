import { NextApiRequest, NextApiResponse } from 'next';
import { getServiceSupabase } from '../../lib/supabase';
import { CANONICAL_FIELD_MAP } from '../../lib/canonicalSchema';
import { processReview } from '../../lib/processReview';

interface ConfirmedMapping {
  uploadedColumn: string;
  canonicalField: string | null;
}

/**
 * POST /api/confirm-mapping
 *
 * Accepts user-confirmed column mappings, transforms the raw CSV data
 * into canonical schema records, re-inserts them into employee_pay_record
 * with all expanded columns, and triggers processReview.
 *
 * Body: {
 *   reviewSessionId: string,
 *   baselineMappings: ConfirmedMapping[],
 *   currentMappings: ConfirmedMapping[]
 * }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { reviewSessionId, baselineMappings, currentMappings } = req.body;

    if (!reviewSessionId) {
      return res.status(400).json({ error: 'reviewSessionId is required' });
    }
    if (!baselineMappings?.length || !currentMappings?.length) {
      return res.status(400).json({ error: 'Mappings are required for both datasets' });
    }

    const supabase = getServiceSupabase();

    // 1. Get datasets for this session
    const { data: datasets, error: dsError } = await supabase
      .from('payroll_dataset')
      .select('*')
      .eq('review_session_id', reviewSessionId);

    if (dsError || !datasets || datasets.length !== 2) {
      return res.status(400).json({ error: 'Could not find both datasets for this session' });
    }

    const baselineDs = datasets.find(d => d.dataset_type === 'baseline');
    const currentDs = datasets.find(d => d.dataset_type === 'current');

    if (!baselineDs || !currentDs) {
      return res.status(400).json({ error: 'Missing baseline or current dataset' });
    }

    // 2. Store user overrides in column_mapping table
    const overrideRows: { review_session_id: string; dataset_type: string; uploaded_column: string; user_override: string | null }[] = [];

    for (const m of baselineMappings) {
      overrideRows.push({
        review_session_id: reviewSessionId,
        dataset_type: 'baseline',
        uploaded_column: m.uploadedColumn,
        user_override: m.canonicalField,
      });
    }
    for (const m of currentMappings) {
      overrideRows.push({
        review_session_id: reviewSessionId,
        dataset_type: 'current',
        uploaded_column: m.uploadedColumn,
        user_override: m.canonicalField,
      });
    }

    // Update existing mapping rows with user overrides (batched by dataset type)
    const overridesByType = new Map<string, typeof overrideRows>();
    for (const row of overrideRows) {
      const key = row.dataset_type;
      if (!overridesByType.has(key)) overridesByType.set(key, []);
      overridesByType.get(key)!.push(row);
    }

    for (const [, typeOverrides] of overridesByType) {
      // Run updates in parallel within each batch for speed
      await Promise.all(
        typeOverrides.map(row =>
          supabase
            .from('column_mapping')
            .update({ user_override: row.user_override })
            .eq('review_session_id', row.review_session_id)
            .eq('dataset_type', row.dataset_type)
            .eq('uploaded_column', row.uploaded_column)
        )
      );
    }

    // 3. Get existing employee records (which have raw data in metadata)
    const { data: baselineRecords } = await supabase
      .from('employee_pay_record')
      .select('*')
      .eq('dataset_id', baselineDs.dataset_id);

    const { data: currentRecords } = await supabase
      .from('employee_pay_record')
      .select('*')
      .eq('dataset_id', currentDs.dataset_id);

    if (!baselineRecords?.length || !currentRecords?.length) {
      return res.status(400).json({ error: 'No employee records found for datasets' });
    }

    // 4. Build mapping lookup: uploaded column → canonical dbColumn
    const buildMappingLookup = (mappings: ConfirmedMapping[]) => {
      const lookup = new Map<string, string>();
      for (const m of mappings) {
        if (m.canonicalField) {
          const field = CANONICAL_FIELD_MAP.get(m.canonicalField);
          if (field?.dbColumn) {
            lookup.set(m.uploadedColumn.toLowerCase(), field.dbColumn);
          }
        }
      }
      return lookup;
    };

    const baselineLookup = buildMappingLookup(baselineMappings);
    const currentLookup = buildMappingLookup(currentMappings);

    // 5. Transform and update employee records using confirmed mappings
    const NUMERIC_COLUMNS = new Set([
      'regular_hours', 'overtime_hours', 'other_paid_hours', 'total_hours_worked',
      'base_earnings', 'overtime_pay', 'bonus_earnings', 'other_earnings',
      'federal_income_tax', 'social_security_tax', 'medicare_tax',
      'state_income_tax', 'local_tax', 'gross_pay', 'net_pay', 'total_deductions',
    ]);

    const transformAndUpdate = async (
      records: any[],
      lookup: Map<string, string>,
    ) => {
      const BATCH_SIZE = 50;
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        const updatePromises = batch.map(record => {
          const rawData = record.metadata?.raw_row || {};
          const updates: Record<string, any> = {};

          for (const [uploadedCol, dbCol] of lookup) {
            const rawValue = rawData[uploadedCol] ?? rawData[uploadedCol.toLowerCase()];
            if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
              if (NUMERIC_COLUMNS.has(dbCol)) {
                const num = parseFloat(String(rawValue).replace(/[,$]/g, ''));
                if (!isNaN(num)) {
                  updates[dbCol] = num;
                }
              } else {
                updates[dbCol] = String(rawValue).trim();
              }
            }
          }

          if (Object.keys(updates).length > 0) {
            return supabase
              .from('employee_pay_record')
              .update(updates)
              .eq('record_id', record.record_id);
          }
          return null;
        }).filter(Boolean);

        const results = await Promise.all(updatePromises);
        for (const result of results) {
          if (result && result.error) {
            console.error('Failed to update employee record:', result.error.message);
          }
        }
      }
    };

    await transformAndUpdate(baselineRecords, baselineLookup);
    await transformAndUpdate(currentRecords, currentLookup);

    // 6. Update session status from pending_mapping to in_progress
    await supabase
      .from('review_session')
      .update({ status: 'in_progress' })
      .eq('review_session_id', reviewSessionId);

    // 7. Trigger full processing (deltas + judgements)
    let processingResult;
    try {
      processingResult = await processReview(reviewSessionId);
    } catch (procError: any) {
      console.error('Processing error after mapping:', procError.message);
      processingResult = {
        success: false,
        error: procError.message,
        delta_count: 0,
        material_count: 0,
        blocker_count: 0,
      };
    }

    return res.status(200).json({
      success: true,
      processing: processingResult,
    });
  } catch (error: any) {
    console.error('Confirm mapping error:', error);
    return res.status(500).json({
      error: 'Failed to confirm mapping',
      details: error.message,
    });
  }
}
