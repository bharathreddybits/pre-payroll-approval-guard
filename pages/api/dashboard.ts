import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getServiceSupabase } from '../../lib/supabase';

/**
 * GET /api/dashboard
 * Fetch dashboard data including stats, recent activity, and review sessions
 *
 * Query params:
 *   - organization_id (optional): Filter by organization
 *   - limit (optional): Number of sessions to return (default: 20)
 *   - offset (optional): Pagination offset (default: 0)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth: require Bearer token and scope data to caller's org
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authorization required' });

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

  try {
    const supabase = getServiceSupabase();

    // Always scope dashboard to the authenticated user's organization
    const { data: userMapping } = await supabase
      .from('user_organization_mapping')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();
    if (!userMapping) return res.status(403).json({ error: 'No organization found' });

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    // organizationId is now always the authenticated user's org (ignoring query param for security)
    const organizationId = userMapping.organization_id;

    // 1a. Get all-time stats (separate count query — not paginated)
    const { data: allTimeSessions } = await supabase
      .from('review_session')
      .select('review_session_id, approval(approval_status)')
      .eq('organization_id', organizationId);

    const allTimeStats = {
      total_reviews: allTimeSessions?.length || 0,
      approved: 0,
      rejected: 0,
      pending: 0,
    };
    let hasCompletedReview = false;
    allTimeSessions?.forEach(session => {
      const approval = Array.isArray(session.approval) ? session.approval[0] : (session.approval as any);
      const status = approval?.approval_status || 'pending';
      if (status === 'approved') { allTimeStats.approved++; hasCompletedReview = true; }
      else if (status === 'rejected') { allTimeStats.rejected++; hasCompletedReview = true; }
      else allTimeStats.pending++;
    });

    // 1b. Get paginated review sessions with full detail
    const { data: sessions, error: sessionsError } = await supabase
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
        ),
        approval (
          approval_id,
          approval_status,
          approval_notes,
          approved_at,
          approved_by
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (sessionsError) {
      console.error('Failed to fetch sessions:', sessionsError);
      return res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }

    // 2. Get delta and judgement counts for each session
    const sessionIds = sessions?.map(s => s.review_session_id) || [];

    let deltaCounts: Record<string, { total: number; material: number; blockers: number }> = {};

    if (sessionIds.length > 0) {
      // Get delta counts
      const { data: deltas, error: deltasError } = await supabase
        .from('payroll_delta')
        .select(`
          review_session_id,
          delta_id,
          material_judgement (
            is_material,
            is_blocker
          )
        `)
        .in('review_session_id', sessionIds);

      if (!deltasError && deltas) {
        // Aggregate counts by session — check ALL judgements per delta
        deltas.forEach(delta => {
          if (!deltaCounts[delta.review_session_id]) {
            deltaCounts[delta.review_session_id] = { total: 0, material: 0, blockers: 0 };
          }
          deltaCounts[delta.review_session_id].total++;

          const judgements = Array.isArray(delta.material_judgement)
            ? delta.material_judgement
            : delta.material_judgement ? [delta.material_judgement] : [];

          const hasMaterial = judgements.some((j: any) => j.is_material);
          const hasBlocker = judgements.some((j: any) => j.is_blocker);

          if (hasMaterial) {
            deltaCounts[delta.review_session_id].material++;
          }
          if (hasBlocker) {
            deltaCounts[delta.review_session_id].blockers++;
          }
        });
      }
    }

    // 3. Stats come from the all-time query (not paginated)
    const stats = allTimeStats;

    // Onboarding status
    const isNewUser = allTimeStats.total_reviews === 0;
    const onboarding = {
      account_created: true, // Always true for logged-in users
      first_upload: (sessions?.length || 0) > 0,
      first_review: hasCompletedReview,
    };

    // 4. Format sessions for response
    const formattedSessions = sessions?.map(session => {
      const currentDataset = Array.isArray(session.payroll_dataset)
        ? session.payroll_dataset.find((d: any) => d.dataset_type === 'current')
        : null;

      const approval = Array.isArray(session.approval) ? session.approval[0] : session.approval;
      const org = session.organization as any;
      const counts = deltaCounts[session.review_session_id] || { total: 0, material: 0, blockers: 0 };

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
        approved_by: approval?.approved_by || null,
        created_at: session.created_at,
      };
    }) || [];

    // 5. Get recent activity (last 10 approvals/rejections)
    const { data: activity } = await supabase
      .from('approval')
      .select(`
        approval_id,
        review_session_id,
        approval_status,
        approval_notes,
        approved_at,
        approved_by,
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
        approved_by: a.approved_by,
      };
    }) || [];

    // Find latest session ID for onboarding checklist
    const latestSessionId = formattedSessions.length > 0
      ? formattedSessions[0].review_session_id
      : null;

    return res.status(200).json({
      stats,
      recent_activity: recentActivity,
      sessions: formattedSessions,
      is_new_user: isNewUser,
      onboarding,
      latest_session_id: latestSessionId,
      pagination: {
        limit,
        offset,
        total: formattedSessions.length,
        has_more: formattedSessions.length === limit,
      },
    });
  } catch (error: any) {
    console.error('Dashboard API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
