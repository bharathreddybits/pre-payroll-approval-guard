import { NextApiRequest, NextApiResponse } from 'next';
import { getServiceSupabase } from '../../../lib/supabase';
import { getRuleMetadata } from '../../../lib/rules/ruleRegistry';
import { getUxSection } from '../../../lib/rules/uxSectionMapping';
import type { EnrichedJudgement, ReviewPageData, ReviewSections, VerdictStatus } from '../../../lib/types/review';

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

    // Parse pagination parameters
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 1000;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    if (limit < 1 || limit > 1000) {
      return res.status(400).json({ error: 'Invalid limit parameter', details: 'Limit must be between 1 and 1000' });
    }
    if (offset < 0) {
      return res.status(400).json({ error: 'Invalid offset parameter', details: 'Offset must be >= 0' });
    }

    // 2. Get deltas with their judgements (with pagination)
    const { data: deltas, error: deltasError, count } = await supabase
      .from('payroll_delta')
      .select(`
        *,
        material_judgement (
          judgement_id,
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

    // 3. Get approval status
    const { data: approval } = await supabase
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

    // 4. Enrich judgements with rule metadata and categorize into UX sections
    const sections: ReviewSections = {
      blockers: [],
      high_risk: [],
      compliance: [],
      volatility: [],
      systemic: [],
      noise: [],
    };

    const allDeltas = deltas || [];

    for (const delta of allDeltas) {
      const judgements = delta.material_judgement || [];

      // Skip deltas with no judgements (non-flagged changes)
      if (judgements.length === 0) continue;

      for (const j of judgements) {
        const ruleMeta = getRuleMetadata(j.rule_id);
        const uxSection = getUxSection(j.rule_id, j.is_blocker);

        const enriched: EnrichedJudgement = {
          // From judgement
          judgement_id: j.judgement_id,
          delta_id: delta.delta_id,
          is_material: j.is_material,
          is_blocker: j.is_blocker,
          confidence_score: j.confidence_score,
          reasoning: j.reasoning,
          rule_id: j.rule_id,

          // From delta
          employee_id: delta.employee_id,
          metric: delta.metric,
          component_name: delta.component_name || null,
          baseline_value: delta.baseline_value,
          current_value: delta.current_value,
          delta_absolute: delta.delta_absolute,
          delta_percentage: delta.delta_percentage,
          change_type: delta.change_type,

          // From rule registry (with fallbacks)
          rule_name: ruleMeta?.name ?? j.rule_id,
          rule_category: ruleMeta?.category ?? 'unknown',
          rule_severity: ruleMeta?.severity ?? (j.is_blocker ? 'blocker' : 'review'),
          user_action: ruleMeta?.userAction ?? 'Review this change and take appropriate action.',
          columns_used: ruleMeta?.columnsUsed ?? [],
          confidence_level: ruleMeta?.confidenceLevel ?? 'MODERATE',
          flag_reason: ruleMeta?.flagReason ?? 'This item was flagged for review.',
          risk_statement: ruleMeta?.riskStatement ?? 'Review this item to ensure accuracy.',
          common_causes: ruleMeta?.commonCauses ?? [],
          review_steps: ruleMeta?.reviewSteps ?? [],

          // UX section
          ux_section: uxSection,
        };

        sections[uxSection].push(enriched);
      }
    }

    // 5. Sort within sections
    // Blockers & high_risk: by confidence desc
    sections.blockers.sort((a, b) => b.confidence_score - a.confidence_score);
    sections.high_risk.sort((a, b) => b.confidence_score - a.confidence_score);
    // Compliance: by confidence desc
    sections.compliance.sort((a, b) => b.confidence_score - a.confidence_score);
    // Volatility: by absolute delta_percentage desc
    sections.volatility.sort((a, b) =>
      Math.abs(b.delta_percentage ?? 0) - Math.abs(a.delta_percentage ?? 0)
    );
    // Systemic & noise: by employee_id
    sections.systemic.sort((a, b) => a.employee_id.localeCompare(b.employee_id));
    sections.noise.sort((a, b) => a.employee_id.localeCompare(b.employee_id));

    // 6. Compute verdict
    const blockersCount = sections.blockers.length;
    const reviewsCount = sections.high_risk.length + sections.compliance.length + sections.volatility.length + sections.systemic.length;
    const infoCount = sections.noise.length;
    const totalFlagged = blockersCount + reviewsCount + infoCount;

    let verdictStatus: VerdictStatus = 'ready_to_approve';
    if (blockersCount > 0) {
      verdictStatus = 'blocked';
    } else if (reviewsCount > 0) {
      verdictStatus = 'review_required';
    }

    const approvalStatus = approval?.approval_status || 'pending';

    const response: ReviewPageData = {
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
      verdict: {
        status: verdictStatus,
        blockers_count: blockersCount,
        reviews_count: reviewsCount,
        info_count: infoCount,
        total_flagged: totalFlagged,
        approval_status: approvalStatus,
      },
      sections,
      pagination: {
        limit,
        offset,
        total: count || allDeltas.length,
        has_more: count ? (offset + limit < count) : false,
        next_offset: count && (offset + limit < count) ? offset + limit : null,
      },
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
