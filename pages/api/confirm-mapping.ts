import { NextApiRequest, NextApiResponse } from 'next';
import { getServiceSupabase } from '../../lib/supabase';
import { verifyToken } from '../../lib/auth/verifyToken';
import { CANONICAL_FIELD_MAP } from '../../lib/canonicalSchema';
import { processReview } from '../../lib/processReview';
import { checkFlexibleImport } from '../../lib/billing';
import { checkSubscriptionAccess } from '../../lib/billing/entitlements';
import { sanitizeErrorMessage } from '../../lib/errorHandler';

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

  const auth = await verifyToken(req, res);
  if (!auth) return;
  const { user } = auth;

  try {
    const { reviewSessionId, baselineMappings, currentMappings } = req.body;

    if (!reviewSessionId) {
      return res.status(400).json({ error: 'reviewSessionId is required' });
    }
    if (!baselineMappings?.length || !currentMappings?.length) {
      return res.status(400).json({ error: 'Mappings are required for both datasets' });
    }

    const supabase = getServiceSupabase();

    // 0. Get review session and check tier
    const { data: session, error: sessionError } = await supabase
      .from('review_session')
      .select('organization_id')
      .eq('review_session_id', reviewSessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Review session not found' });
    }

    // Verify caller belongs to the session's organization
    const { data: callerMapping } = await supabase
      .from('user_organization_mapping')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();
    if (!callerMapping || callerMapping.organization_id !== session.organization_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Subscription gate: must have active/trialing access before any processing
    const subAccess = await checkSubscriptionAccess(session.organization_id);
    if (!subAccess.hasAccess) {
      return res.status(402).json({ error: 'Subscription required', upgrade_url: '/pricing' });
    }

    // Check if flexible import (which requires column mapping) is available
    const flexibleImportCheck = await checkFlexibleImport(session.organization_id);
    if (!flexibleImportCheck.allowed) {
      return res.status(403).json({
        error: 'Feature not available',
        message: flexibleImportCheck.reason,
        upgrade_url: '/pricing',
      });
    }

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

    // Require at least one core canonical field on each dataset.
    // If zero fields are mapped (e.g. map-columns was never called and no column_mapping
    // rows exist), every employee record stays at stub-zero values and the engine produces
    // meaningless results without any error. Guard here so the session fails visibly.
    const CORE_FIELDS = new Set(['gross_pay', 'net_pay', 'employee_id']);
    const baselineCoreCount = [...baselineLookup.values()].filter(col => CORE_FIELDS.has(col)).length;
    const currentCoreCount = [...currentLookup.values()].filter(col => CORE_FIELDS.has(col)).length;
    if (baselineCoreCount === 0 || currentCoreCount === 0) {
      return res.status(400).json({
        error: 'Insufficient column mapping',
        details: 'At least one of gross_pay, net_pay, or employee_id must be mapped for each dataset',
      });
    }

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
        const failures = results.filter((r): r is NonNullable<typeof r> => !!r?.error);
        if (failures.length > 0) {
          const msgs = failures.map(r => r.error!.message).join('; ');
          throw new Error(`Failed to update ${failures.length} employee record(s): ${msgs}`);
        }
      }
    };

    // If transformAndUpdate fails mid-batch (e.g. Vercel timeout), some records
    // will have canonical values while others still hold stub zeros. Processing
    // that partial state produces completely wrong judgements. Mark the session
    // failed immediately so the user can re-upload rather than receiving a
    // poisoned review result.
    try {
      await transformAndUpdate(baselineRecords, baselineLookup);
      await transformAndUpdate(currentRecords, currentLookup);
    } catch (updateError: any) {
      console.error('Employee record update failed mid-batch:', updateError.message);
      await supabase.from('review_session').update({ status: 'failed' }).eq('review_session_id', reviewSessionId);
      return res.status(500).json({
        error: 'Failed to apply column mappings to employee records',
        details: sanitizeErrorMessage(updateError),
        action: 'Please re-upload your payroll files and try again',
      });
    }

    // 6. Run processing with a 25-second timeout guard.
    // Vercel kills the function at 30s; we race to mark the session 'failed' cleanly
    // before that happens, rather than leaving it stuck in 'pending_mapping'.
    const PROCESSING_TIMEOUT_MS = 25_000;
    let processingResult;
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Processing timed out — payroll may be too large for synchronous processing')), PROCESSING_TIMEOUT_MS)
      );
      processingResult = await Promise.race([processReview(reviewSessionId), timeoutPromise]);
    } catch (procError: any) {
      console.error('Processing error after mapping:', procError.message);
      await supabase
        .from('review_session')
        .update({ status: 'failed' })
        .eq('review_session_id', reviewSessionId);
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
      review_session_id: reviewSessionId,
    });
  } catch (error: any) {
    console.error('Confirm mapping error:', error);
    return res.status(500).json({
      error: 'Failed to confirm mapping',
      details: sanitizeErrorMessage(error),
    });
  }
}
