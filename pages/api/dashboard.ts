import { NextApiRequest, NextApiResponse } from 'next';
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

  try {
    const supabase = getServiceSupabase();

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    const organizationId = req.query.organization_id as string | undefined;

    // 1. Get review sessions with approval data
    let sessionsQuery = supabase
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
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (organizationId) {
      sessionsQuery = sessionsQuery.eq('organization_id', organizationId);
    }

    const { data: sessions, error: sessionsError } = await sessionsQuery;

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
        // Aggregate counts by session
        deltas.forEach(delta => {
          if (!deltaCounts[delta.review_session_id]) {
            deltaCounts[delta.review_session_id] = { total: 0, material: 0, blockers: 0 };
          }
          deltaCounts[delta.review_session_id].total++;

          const judgement = Array.isArray(delta.material_judgement)
            ? delta.material_judgement[0]
            : delta.material_judgement;

          if (judgement?.is_material) {
            deltaCounts[delta.review_session_id].material++;
          }
          if (judgement?.is_blocker) {
            deltaCounts[delta.review_session_id].blockers++;
          }
        });
      }
    }

    // 3. Calculate stats
    const stats = {
      total_reviews: sessions?.length || 0,
      approved: 0,
      rejected: 0,
      pending: 0,
    };

    sessions?.forEach(session => {
      const approval = Array.isArray(session.approval) ? session.approval[0] : session.approval;
      const status = approval?.approval_status || 'pending';
      if (status === 'approved') stats.approved++;
      else if (status === 'rejected') stats.rejected++;
      else stats.pending++;
    });

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
    let activityQuery = supabase
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
      .not('approval_status', 'eq', 'pending')
      .order('approved_at', { ascending: false })
      .limit(10);

    if (organizationId) {
      activityQuery = activityQuery.eq('organization_id', organizationId);
    }

    const { data: activity, error: activityError } = await activityQuery;

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

    return res.status(200).json({
      stats,
      recent_activity: recentActivity,
      sessions: formattedSessions,
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
