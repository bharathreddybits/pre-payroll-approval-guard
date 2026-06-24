import { NextApiRequest, NextApiResponse } from 'next';
import { getServiceSupabase } from '../../lib/supabase';
import { verifyToken } from '../../lib/auth/verifyToken';
import { sanitizeErrorMessage } from '../../lib/errorHandler';
import { checkSubscriptionAccess } from '../../lib/billing/entitlements';

/**
 * POST /api/approve
 * Approve or reject a review session
 *
 * Request body:
 *   {
 *     review_session_id: string,
 *     approval_status: 'approved' | 'rejected',
 *     approval_notes?: string,
 *     approved_by?: string (user ID)
 *   }
 *
 * Response:
 *   {
 *     success: boolean,
 *     approval_id: string,
 *     approval_status: string,
 *     approved_at: string
 *   }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await verifyToken(req, res);
  if (!auth) return;
  const { user } = auth;

  try {
    // approved_by is intentionally NOT accepted from the client body — it is always
    // derived from the authenticated user's token (see approvalData below).
    const { review_session_id, approval_status, approval_notes } = req.body;

    if (!review_session_id) {
      return res.status(400).json({ error: 'review_session_id is required' });
    }
    if (!approval_status || !['approved', 'rejected'].includes(approval_status)) {
      return res.status(400).json({ error: 'approval_status must be "approved" or "rejected"' });
    }
    if (approval_notes !== undefined && approval_notes !== null) {
      if (typeof approval_notes !== 'string') {
        return res.status(400).json({ error: 'approval_notes must be a string' });
      }
      if (approval_notes.length > 2000) {
        return res.status(400).json({ error: 'approval_notes must not exceed 2000 characters' });
      }
    }

    // If rejecting, notes are required (trim whitespace before length check)
    const trimmedNotes = typeof approval_notes === 'string' ? approval_notes.trim() : '';
    if (approval_status === 'rejected' && trimmedNotes.length < 10) {
      return res.status(400).json({
        error: 'approval_notes are required for rejections (minimum 10 characters)',
      });
    }

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

    // Check if review session exists and get organization_id
    const { data: session, error: sessionError } = await supabase
      .from('review_session')
      .select('review_session_id, organization_id, status')
      .eq('review_session_id', review_session_id)
      .single();

    if (sessionError || !session) {
      console.error('Review session not found:', sessionError);
      return res.status(404).json({ error: 'Review session not found' });
    }

    // Verify caller's org matches the session's org
    if (mapping.organization_id !== session.organization_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Session must be in a reviewable state (rules engine must have run)
    if (!['completed', 'reviewed'].includes(session.status)) {
      return res.status(400).json({
        error: 'Cannot approve or reject — payroll data is still being processed',
        current_status: session.status,
      });
    }

    // Check for blockers if approving
    if (approval_status === 'approved') {
      // Get all deltas for this session — zero deltas (identical payrolls) is fine to approve
      const { data: deltas, error: deltasError } = await supabase
        .from('payroll_delta')
        .select('delta_id')
        .eq('review_session_id', review_session_id);

      if (deltasError) {
        console.error('Failed to fetch deltas:', deltasError);
        return res.status(500).json({ error: 'Failed to validate approval' });
      }

      // Check for blockers in judgements — only if there are any deltas
      const deltaIds = (deltas ?? []).map(d => d.delta_id);
      let blockerJudgements: any[] | null = null;
      let blockersError: any = null;

      if (deltaIds.length > 0) {
        const result = await supabase
          .from('material_judgement')
          .select('judgement_id, delta_id, is_blocker, reasoning')
          .in('delta_id', deltaIds)
          .eq('is_blocker', true);
        blockerJudgements = result.data;
        blockersError = result.error;
      }

      if (blockersError) {
        console.error('Failed to check for blockers:', blockersError);
        return res.status(500).json({ error: 'Failed to validate approval' });
      }

      if (blockerJudgements && blockerJudgements.length > 0) {
        return res.status(400).json({
          error: 'Cannot approve payroll with active blockers',
          blocker_count: blockerJudgements.length,
          blockers: blockerJudgements.map(b => ({
            delta_id: b.delta_id,
            reasoning: b.reasoning
          })),
          message: 'Please resolve all blockers before approving',
        });
      }
    }

    // Check if approval already exists — finalized decisions are immutable (audit trail integrity)
    const { data: existingApproval } = await supabase
      .from('approval')
      .select('approval_id, approval_status')
      .eq('review_session_id', review_session_id)
      .single();

    if (existingApproval && ['approved', 'rejected'].includes(existingApproval.approval_status)) {
      return res.status(409).json({
        error: 'Payroll already finalized',
        current_status: existingApproval.approval_status,
        message: `This payroll run was already ${existingApproval.approval_status}. Finalized decisions cannot be changed to preserve the audit trail.`,
      });
    }

    // Create approval record
    // approved_by always comes from the authenticated user, never from client body
    const approvalData = {
      review_session_id,
      organization_id: session.organization_id,
      approved_by: user.id,
      approval_status,
      approval_notes: trimmedNotes || null,
      approved_at: new Date().toISOString(),
    };

    let approval;
    if (existingApproval) {
      // Pending record exists — update it (e.g., re-submitting after a validation error)
      const { data, error } = await supabase
        .from('approval')
        .update(approvalData)
        .eq('approval_id', existingApproval.approval_id)
        .select()
        .single();

      if (error) {
        console.error('Failed to update approval:', error);
        return res.status(500).json({ error: 'Failed to update approval' });
      }

      approval = data;
    } else {
      // Create new approval
      const { data, error } = await supabase
        .from('approval')
        .insert(approvalData)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          // Unique constraint on review_session_id — concurrent approval requests; return 409
          return res.status(409).json({
            error: 'Payroll already finalized',
            message: 'Another approval decision was submitted concurrently for this session.',
          });
        }
        console.error('Failed to create approval:', error);
        return res.status(500).json({ error: 'Failed to create approval' });
      }

      approval = data;
    }

    // Update review session status — throw on failure so the response reflects reality.
    // The approval record is already written; a divergent session status would cause
    // the UI to show the wrong state on every subsequent review page load.
    const newStatus = approval_status === 'approved' ? 'approved' : 'reviewed';
    const { error: updateError } = await supabase
      .from('review_session')
      .update({ status: newStatus })
      .eq('review_session_id', review_session_id);

    if (updateError) {
      console.error('Failed to update review session status:', updateError);
      throw new Error(`Approval recorded but session status update failed: ${updateError.message}`);
    }

    return res.status(200).json({
      success: true,
      approval_id: approval.approval_id,
      approval_status: approval.approval_status,
      approved_at: approval.approved_at,
    });
  } catch (error: any) {
    console.error('Approval error:', error);
    return res.status(500).json({
      error: 'Failed to process approval',
      details: sanitizeErrorMessage(error),
    });
  }
}
