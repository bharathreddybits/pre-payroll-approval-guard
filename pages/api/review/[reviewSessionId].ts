import { NextApiRequest, NextApiResponse } from 'next';
import { getServiceSupabase } from '../../../lib/supabase';
import { verifyToken } from '../../../lib/auth/verifyToken';
import { checkSubscriptionAccess } from '../../../lib/billing/entitlements';
import { getRuleMetadata } from '../../../lib/rules/ruleRegistry';
import { getUxSection } from '../../../lib/rules/uxSectionMapping';
import { sanitizeErrorMessage } from '../../../lib/errorHandler';
import type { EnrichedJudgement, ReviewPageData, ReviewSections, VerdictStatus } from '../../../lib/types/review';

interface DeltaRow {
  delta_id: string;
  employee_id: string;
  metric: string;
  component_name: string | null;
  baseline_value: number | null;
  current_value: number | null;
  delta_absolute: number | null;
  delta_percentage: number | null;
  change_type: string;
  created_at: string;
  material_judgement: JudgementRow[];
}

interface JudgementRow {
  judgement_id: string;
  is_material: boolean;
  is_blocker: boolean;
  confidence_score: number;
  reasoning: string;
  rule_id: string;
  reviewer_notes: string | null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { reviewSessionId } = req.query;

  if (!reviewSessionId || typeof reviewSessionId !== 'string') {
    return res.status(400).json({ error: 'reviewSessionId is required' });
  }

  const auth = await verifyToken(req, res);
  if (!auth) return;
  const { user } = auth;

  try {
    const supabase = getServiceSupabase();

    // Look up user's organization
    const { data: mapping } = await supabase
      .from('user_organization_mapping')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();
    if (!mapping) return res.status(403).json({ error: 'No organization found' });

    // Server-side subscription gate
    const subAccess = await checkSubscriptionAccess(mapping.organization_id);
    if (!subAccess.hasAccess) {
      return res.status(402).json({ error: 'Subscription required', upgrade_url: '/pricing' });
    }

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

    // Verify caller's org matches the session's org
    if (mapping.organization_id !== session.organization_id) {
      return res.status(403).json({ error: 'Access denied' });
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

    // 2a. Aggregate counts for accurate verdict — independent of display pagination.
    // Fetch all delta IDs for the session, then count blocker and review judgements.
    // This prevents MISS-001: blockers beyond page 1 being invisible to the verdict.
    const { data: allDeltaIds } = await supabase
      .from('payroll_delta')
      .select('delta_id')
      .eq('review_session_id', reviewSessionId);

    const deltaIdList = allDeltaIds?.map((d: { delta_id: string }) => d.delta_id) ?? [];

    let aggregateBlockers = 0;
    let aggregateReviews = 0;

    if (deltaIdList.length > 0) {
      const { count: bCount } = await supabase
        .from('material_judgement')
        .select('*', { count: 'exact', head: true })
        .in('delta_id', deltaIdList)
        .eq('is_blocker', true);
      aggregateBlockers = bCount ?? 0;

      const { count: mCount } = await supabase
        .from('material_judgement')
        .select('*', { count: 'exact', head: true })
        .in('delta_id', deltaIdList)
        .eq('is_material', true)
        .eq('is_blocker', false);
      aggregateReviews = mCount ?? 0;
    }

    // 2b. Get paginated deltas with their judgements (for UI display)
    const { data: deltas, error: deltasError, count } = await supabase
      .from('payroll_delta')
      .select(`
        delta_id,
        employee_id,
        metric,
        component_name,
        baseline_value,
        current_value,
        delta_absolute,
        delta_percentage,
        change_type,
        created_at,
        material_judgement (
          judgement_id,
          is_material,
          is_blocker,
          confidence_score,
          reasoning,
          rule_id,
          reviewer_notes
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

          // Reviewer notes from DB
          reviewer_notes: j.reviewer_notes || '',

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

          // NEW: 4-Line Golden Template fields (with fallbacks)
          judgment_category: ruleMeta?.judgmentCategory,
          triggered_condition: ruleMeta?.triggeredCondition,
          why_this_matters: ruleMeta?.whyThisMatters,
          reviewer_action: ruleMeta?.reviewerAction,
          ui_hints: ruleMeta?.uiHints,
          system_limits: ruleMeta?.systemLimits,

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

    // 6. Compute verdict using session-wide aggregate counts, not paginated section lengths.
    // Page 1 can miss blockers on later pages — use the pre-computed aggregates.
    const blockersCount = aggregateBlockers;
    const reviewsCount = aggregateReviews;
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
      details: sanitizeErrorMessage(error),
    });
  }
}
