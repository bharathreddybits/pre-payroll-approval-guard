import { NextApiRequest, NextApiResponse } from 'next';
import { getServiceSupabase } from '../../lib/supabase';
import { verifyToken } from '../../lib/auth/verifyToken';
import { sanitizeErrorMessage } from '../../lib/errorHandler';

/**
 * GET /api/dashboard
 * Fetch dashboard data including stats, recent activity, and review sessions.
 *
 * Query params:
 *   - limit (optional): Number of sessions to return (default: 20)
 *   - offset (optional): Pagination offset (default: 0)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await verifyToken(req, res);
  if (!auth) return;
  const { user } = auth;

  try {
    const supabase = getServiceSupabase();

    // Always scope dashboard to the authenticated user's organization
    const { data: userMapping } = await supabase
      .from('user_organization_mapping')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();
    if (!userMapping) return res.status(403).json({ error: 'No organization found' });

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    const organizationId = userMapping.organization_id;

    // 1a. All-time stats via SQL COUNT aggregates — avoids loading all session rows.
    // An org with 5,000 reviews would previously load all 5,000+ rows to count them.
    const [
      { count: totalReviews },
      { count: approvedCount },
      { count: rejectedCount },
    ] = await Promise.all([
      supabase.from('review_session').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
      supabase.from('approval').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('approval_status', 'approved'),
      supabase.from('approval').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('approval_status', 'rejected'),
    ]);
    const total_reviews = totalReviews ?? 0;
    const approved = approvedCount ?? 0;
    const rejected = rejectedCount ?? 0;
    const allTimeStats = { total_reviews, approved, rejected, pending: total_reviews - approved - rejected };
    const hasCompletedReview = approved + rejected > 0;

    // 1b. Get paginated review sessions.
    // delta_count/material_count/blocker_count are denormalized onto review_session
    // (migration 017) so no payroll_delta join is needed — O(1) per session.
    const { data: sessions, error: sessionsError, count: totalSessionCount } = await supabase
      .from('review_session')
      .select(`
        review_session_id,
        organization_id,
        status,
        created_at,
        delta_count,
        material_count,
        blocker_count,
        organization (
          organization_name
        ),
        payroll_dataset (
          dataset_type,
          period_start_date,
          period_end_date,
          pay_date,
          run_type
        ),
        approval (
          approval_id,
          approval_status,
          approval_notes,
          approved_at
        )
      `, { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (sessionsError) {
      console.error('Failed to fetch sessions:', sessionsError);
      return res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }

    // 2. Get delta counts and judgement counts for sessions on this page.
    //    API-002 fix: fetch only (review_session_id, delta_id) rows rather than full delta
    //    rows with nested material_judgement join, which was unbounded and O(n*m) in data.
    const sessionIds = sessions?.map(s => s.review_session_id) ?? [];
    const deltaCounts: Record<string, { total: number; material: number; blockers: number }> = {};

    if (sessionIds.length > 0) {
      // Fetch lean rows — just the two IDs needed for counting and lookup
      const { data: deltaRows } = await supabase
        .from('payroll_delta')
        .select('review_session_id, delta_id')
        .in('review_session_id', sessionIds);

      const deltaToSession = new Map<string, string>();
      for (const d of deltaRows ?? []) {
        if (!deltaCounts[d.review_session_id]) {
          deltaCounts[d.review_session_id] = { total: 0, material: 0, blockers: 0 };
        }
        deltaCounts[d.review_session_id].total++;
        deltaToSession.set(d.delta_id, d.review_session_id);
      }

      const allDeltaIds = [...deltaToSession.keys()];
      if (allDeltaIds.length > 0) {
        // Fetch only the three lightweight columns needed for aggregation
        const { data: judgementRows } = await supabase
          .from('material_judgement')
          .select('delta_id, is_material, is_blocker')
          .in('delta_id', allDeltaIds);

        for (const j of judgementRows ?? []) {
          const sid = deltaToSession.get(j.delta_id);
          if (!sid || !deltaCounts[sid]) continue;
          if (j.is_material) deltaCounts[sid].material++;
          if (j.is_blocker) deltaCounts[sid].blockers++;
        }
      }
    }

    const isNewUser = allTimeStats.total_reviews === 0;
    const onboarding = {
      account_created: true,
      first_upload: (sessions?.length ?? 0) > 0,
      first_review: hasCompletedReview,
    };

    // 4. Format sessions — never expose approved_by (raw user UUID)
    const formattedSessions = sessions?.map(session => {
      const currentDataset = Array.isArray(session.payroll_dataset)
        ? session.payroll_dataset.find((d: any) => d.dataset_type === 'current')
        : null;
      const approval = Array.isArray(session.approval) ? session.approval[0] : session.approval as any;
      const org = session.organization as any;
      const counts = deltaCounts[session.review_session_id] ?? { total: 0, material: 0, blockers: 0 };

      return {
        review_session_id: session.review_session_id,
        organization_id: session.organization_id,
        organization_name: org?.organization_name || 'Unknown',
        status: session.status,
        period: currentDataset
          ? `${currentDataset.period_start_date} to ${currentDataset.period_end_date}`
          : 'N/A',
        pay_date: currentDataset?.pay_date || 'N/A',
        run_type: currentDataset?.run_type || 'regular',
        total_changes: counts.total,
        material_changes: counts.material,
        blockers: counts.blockers,
        approval_status: approval?.approval_status || 'pending',
        approval_notes: approval?.approval_notes || null,
        approved_at: approval?.approved_at || null,
        created_at: session.created_at,
      };
    }) ?? [];

    // 5. Get recent activity — exclude approved_by UUID
    const { data: activity } = await supabase
      .from('approval')
      .select(`
        approval_id,
        review_session_id,
        approval_status,
        approval_notes,
        approved_at,
        review_session (
          organization (
            organization_name
          ),
          payroll_dataset (
            dataset_type,
            period_start_date,
            period_end_date
          )
        )
      `)
      .eq('organization_id', organizationId)
      .not('approval_status', 'eq', 'pending')
      .order('approved_at', { ascending: false })
      .limit(10);

    const recentActivity = activity?.map(a => {
      const reviewSession = a.review_session as any;
      const org = reviewSession?.organization;
      const currentDataset = Array.isArray(reviewSession?.payroll_dataset)
        ? reviewSession.payroll_dataset.find((d: any) => d.dataset_type === 'current')
        : null;

      return {
        approval_id: a.approval_id,
        review_session_id: a.review_session_id,
        organization_name: org?.organization_name || 'Unknown',
        period: currentDataset
          ? `${currentDataset.period_start_date} to ${currentDataset.period_end_date}`
          : 'N/A',
        approval_status: a.approval_status,
        approval_notes: a.approval_notes,
        approved_at: a.approved_at,
      };
    }) ?? [];

    const latestSessionId = formattedSessions.length > 0
      ? formattedSessions[0].review_session_id
      : null;

    const total = totalSessionCount ?? 0;

    return res.status(200).json({
      stats: allTimeStats,
      recent_activity: recentActivity,
      sessions: formattedSessions,
      is_new_user: isNewUser,
      onboarding,
      latest_session_id: latestSessionId,
      pagination: {
        limit,
        offset,
        total,
        has_more: offset + formattedSessions.length < total,
      },
    });
  } catch (error: any) {
    console.error('Dashboard API error:', error);
    return res.status(500).json({ error: sanitizeErrorMessage(error) });
  }
}
