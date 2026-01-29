import { NextApiRequest, NextApiResponse } from 'next';
import { getServiceSupabase } from '../../../lib/supabase';

/**
 * GET /api/review/[reviewSessionId]
 * Fetch all data needed for the review page
 *
 * Response:
 *   {
 *     session: {
 *       review_session_id: string,
 *       organization_name: string,
 *       status: string,
 *       baseline_period: string,
 *       current_period: string,
 *       pay_date: string,
 *       run_type: string
 *     },
 *     summary: {
 *       total_changes: number,
 *       material_changes: number,
 *       blockers_count: number,
 *       approval_status: string
 *     },
 *     blockers: Array<Delta & Judgement>,
 *     material_changes: {
 *       net_pay: Array<Delta & Judgement>,
 *       gross_pay: Array<Delta & Judgement>,
 *       total_deductions: Array<Delta & Judgement>,
 *       component: Array<Delta & Judgement>
 *     },
 *     non_material_changes: Array<Delta & Judgement>
 *   }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { reviewSessionId } = req.query;

  if (!reviewSessionId || typeof reviewSessionId !== 'string') {
    return res.status(400).json({ error: 'reviewSessionId is required' });
  }

  try {
    const supabase = getServiceSupabase();

    // 1. Get review session metadata with organization and datasets
    const { data: session, error: sessionError } = await supabase
      .from('review_session')
      .select(`
        review_session_id,
        organization_id,
        status,
        created_at,
        organization (
          organization_name
        ),
        payroll_dataset (
          dataset_type,
          period_start_date,
          period_end_date,
          pay_date,
          run_type
        )
      `)
      .eq('review_session_id', reviewSessionId)
      .single();

    if (sessionError || !session) {
      console.error('Failed to fetch review session:', sessionError);
      return res.status(404).json({ error: 'Review session not found' });
    }

    // Parse pagination parameters from query
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 1000;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    // Validate pagination parameters
    if (limit < 1 || limit > 1000) {
      return res.status(400).json({
        error: 'Invalid limit parameter',
        details: 'Limit must be between 1 and 1000'
      });
    }
    if (offset < 0) {
      return res.status(400).json({
        error: 'Invalid offset parameter',
        details: 'Offset must be >= 0'
      });
    }

    // 2. Get deltas with their judgements and employee info (with pagination)
    const { data: deltas, error: deltasError, count } = await supabase
      .from('payroll_delta')
      .select(`
        *,
        material_judgement (
          is_material,
          is_blocker,
          confidence_score,
          reasoning,
          rule_id
        )
      `, { count: 'exact' })
      .eq('review_session_id', reviewSessionId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (deltasError) {
      console.error('Failed to fetch deltas:', deltasError);
      return res.status(500).json({ error: 'Failed to fetch comparison data' });
    }

    // 3. Get summary stats from the view
    const { data: summaryData, error: summaryError } = await supabase
      .from('latest_review_sessions')
      .select('*')
      .eq('review_session_id', reviewSessionId)
      .single();

    if (summaryError) {
      console.error('Failed to fetch summary:', summaryError);
      // Continue without summary data
    }

    // 4. Get approval status
    const { data: approval, error: approvalError } = await supabase
      .from('approval')
      .select('*')
      .eq('review_session_id', reviewSessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Extract baseline and current dataset info
    const datasets = session.payroll_dataset || [];
    const baseline = datasets.find((d: any) => d.dataset_type === 'baseline');
    const current = datasets.find((d: any) => d.dataset_type === 'current');

    // Categorize deltas
    const allDeltas = deltas || [];
    const blockers = allDeltas.filter((d: any) => d.material_judgement?.[0]?.is_blocker);
    const materialChanges = allDeltas.filter(
      (d: any) => d.material_judgement?.[0]?.is_material && !d.material_judgement?.[0]?.is_blocker
    );
    const nonMaterialChanges = allDeltas.filter((d: any) => !d.material_judgement?.[0]?.is_material);

    // Group material changes by metric
    const groupByMetric = (changes: any[]) => {
      return changes.reduce((acc: any, change: any) => {
        const metric = change.metric;
        if (!acc[metric]) {
          acc[metric] = [];
        }
        acc[metric].push({
          ...change,
          material_judgement: change.material_judgement?.[0] || null,
        });
        return acc;
      }, {});
    };

    const materialChangesByMetric = groupByMetric(materialChanges);

    // Format response
    const response = {
      session: {
        review_session_id: session.review_session_id,
        organization_name: (session.organization as any)?.organization_name || 'Unknown',
        status: session.status,
        baseline_period: baseline
          ? `${baseline.period_start_date} to ${baseline.period_end_date}`
          : 'Unknown',
        current_period: current
          ? `${current.period_start_date} to ${current.period_end_date}`
          : 'Unknown',
        pay_date: current?.pay_date || 'Unknown',
        run_type: current?.run_type || 'regular',
        created_at: session.created_at,
      },
      summary: {
        total_changes: summaryData?.total_changes || count || allDeltas.length,
        material_changes: summaryData?.material_changes || materialChanges.length,
        blockers_count: summaryData?.blockers || blockers.length,
        approval_status: approval?.approval_status || 'pending',
      },
      pagination: {
        limit,
        offset,
        total: count || allDeltas.length,
        has_more: count ? (offset + limit < count) : false,
        next_offset: count && (offset + limit < count) ? offset + limit : null
      },
      blockers: blockers.map((d: any) => ({
        ...d,
        material_judgement: d.material_judgement?.[0] || null,
      })),
      material_changes: materialChangesByMetric,
      non_material_changes: nonMaterialChanges.map((d: any) => ({
        ...d,
        material_judgement: d.material_judgement?.[0] || null,
      })),
    };

    return res.status(200).json(response);
  } catch (error: any) {
    console.error('Review data fetch error:', error);
    return res.status(500).json({
      error: 'Failed to fetch review data',
      details: error.message,
    });
  }
}
