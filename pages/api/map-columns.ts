import { NextApiRequest, NextApiResponse } from 'next';
import { getServiceSupabase } from '../../lib/supabase';
import { mapColumns } from '../../lib/columnMapper';

/**
 * POST /api/map-columns
 *
 * Accepts CSV headers + sample rows for baseline and current datasets,
 * runs AI or mock column mapping, stores results in column_mapping table,
 * and returns suggestions to the frontend.
 *
 * Body: {
 *   reviewSessionId: string,
 *   baselineHeaders: string[],
 *   baselineSample: Record<string, string>[],
 *   currentHeaders: string[],
 *   currentSample: Record<string, string>[]
 * }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      reviewSessionId,
      extractFromSession,
    } = req.body;

    let { baselineHeaders, baselineSample, currentHeaders, currentSample } = req.body;

    if (!reviewSessionId) {
      return res.status(400).json({ error: 'reviewSessionId is required' });
    }

    const supabase = getServiceSupabase();

    // Verify the review session exists
    const { data: session, error: sessionError } = await supabase
      .from('review_session')
      .select('review_session_id, status')
      .eq('review_session_id', reviewSessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Review session not found' });
    }

    // If headers not provided, extract from stored raw_row metadata in employee records
    if (extractFromSession || !baselineHeaders?.length || !currentHeaders?.length) {
      const { data: datasets } = await supabase
        .from('payroll_dataset')
        .select('dataset_id, dataset_type')
        .eq('review_session_id', reviewSessionId);

      if (!datasets || datasets.length === 0) {
        return res.status(400).json({ error: 'No datasets found for this session' });
      }

      const baselineDs = datasets.find(d => d.dataset_type === 'baseline');
      const currentDs = datasets.find(d => d.dataset_type === 'current');

      const extractHeaders = async (datasetId: string) => {
        const { data: records } = await supabase
          .from('employee_pay_record')
          .select('metadata')
          .eq('dataset_id', datasetId)
          .limit(10);

        if (!records?.length) return { headers: [] as string[], sample: [] as Record<string, string>[] };

        const rawRows = records
          .map(r => r.metadata?.raw_row)
          .filter(Boolean) as Record<string, string>[];

        const headers = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
        return { headers, sample: rawRows.slice(0, 5) };
      };

      if (baselineDs && (!baselineHeaders?.length)) {
        const extracted = await extractHeaders(baselineDs.dataset_id);
        baselineHeaders = extracted.headers;
        baselineSample = extracted.sample;
      }
      if (currentDs && (!currentHeaders?.length)) {
        const extracted = await extractHeaders(currentDs.dataset_id);
        currentHeaders = extracted.headers;
        currentSample = extracted.sample;
      }
    }

    if (!baselineHeaders?.length || !currentHeaders?.length) {
      return res.status(400).json({ error: 'Could not determine column headers from stored data' });
    }

    // Map both datasets
    const [baselineResult, currentResult] = await Promise.all([
      mapColumns(baselineHeaders, baselineSample || []),
      mapColumns(currentHeaders, currentSample || []),
    ]);

    // Store mapping results in column_mapping table
    const mappingRows = [
      ...baselineResult.mappings.map(m => ({
        review_session_id: reviewSessionId,
        dataset_type: 'baseline' as const,
        uploaded_column: m.uploadedColumn,
        canonical_field: m.canonicalField,
        confidence: m.confidence,
        reasoning: m.reasoning,
      })),
      ...currentResult.mappings.map(m => ({
        review_session_id: reviewSessionId,
        dataset_type: 'current' as const,
        uploaded_column: m.uploadedColumn,
        canonical_field: m.canonicalField,
        confidence: m.confidence,
        reasoning: m.reasoning,
      })),
    ];

    const { error: insertError } = await supabase
      .from('column_mapping')
      .insert(mappingRows);

    if (insertError) {
      console.error('Failed to store column mappings:', insertError);
      return res.status(500).json({ error: 'Failed to store mapping results' });
    }

    return res.status(200).json({
      success: true,
      baseline: {
        mappings: baselineResult.mappings,
        method: baselineResult.method,
      },
      current: {
        mappings: currentResult.mappings,
        method: currentResult.method,
      },
    });
  } catch (error: any) {
    console.error('Map columns error:', error);
    return res.status(500).json({
      error: 'Failed to map columns',
      details: error.message,
    });
  }
}
