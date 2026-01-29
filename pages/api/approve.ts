import { NextApiRequest, NextApiResponse } from 'next';
import { getServiceSupabase } from '../../lib/supabase';

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

  try {
    const { review_session_id, approval_status, approval_notes, approved_by } = req.body;

    // Validate required fields
    if (!review_session_id) {
      return res.status(400).json({ error: 'review_session_id is required' });
    }

    if (!approval_status || !['approved', 'rejected'].includes(approval_status)) {
      return res.status(400).json({ error: 'approval_status must be "approved" or "rejected"' });
    }

    // If rejecting, notes are required
    if (approval_status === 'rejected' && (!approval_notes || approval_notes.length < 10)) {
      return res.status(400).json({
        error: 'approval_notes are required for rejections (minimum 10 characters)',
      });
    }

    const supabase = getServiceSupabase();

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

    // Check for blockers if approving
    if (approval_status === 'approved') {
      // First get all deltas for this session
      const { data: deltas, error: deltasError } = await supabase
        .from('payroll_delta')
        .select('delta_id')
        .eq('review_session_id', review_session_id);

      if (deltasError) {
        console.error('Failed to fetch deltas:', deltasError);
        return res.status(500).json({ error: 'Failed to validate approval' });
      }

      if (!deltas || deltas.length === 0) {
        return res.status(400).json({
          error: 'Cannot approve - no payroll changes found',
          message: 'Review session has no delta records',
        });
      }

      // Then check for blockers in judgements
      const deltaIds = deltas.map(d => d.delta_id);
      const { data: blockerJudgements, error: blockersError } = await supabase
        .from('material_judgement')
        .select('judgement_id, delta_id, is_blocker, reasoning')
        .in('delta_id', deltaIds)
        .eq('is_blocker', true);

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

    // Create or update approval record
    const approvalData = {
      review_session_id,
      organization_id: session.organization_id,
      approved_by: approved_by || null,
      approval_status,
      approval_notes: approval_notes || null,
      approved_at: new Date().toISOString(),
    };

    // Check if approval already exists
    const { data: existingApproval } = await supabase
      .from('approval')
      .select('approval_id')
      .eq('review_session_id', review_session_id)
      .single();

    let approval;
    if (existingApproval) {
      // Update existing approval
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
        console.error('Failed to create approval:', error);
        return res.status(500).json({ error: 'Failed to create approval' });
      }

      approval = data;
    }

    // Update review session status
    const newStatus = approval_status === 'approved' ? 'completed' : 'reviewed';
    const { error: updateError } = await supabase
      .from('review_session')
      .update({ status: newStatus })
      .eq('review_session_id', review_session_id);

    if (updateError) {
      console.error('Failed to update review session status:', updateError);
      // Don't fail the request, approval is already recorded
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
      details: error.message,
    });
  }
}
