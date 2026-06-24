import { NextApiRequest, NextApiResponse } from 'next';
import { getServiceSupabase } from '../../lib/supabase';
import { verifyToken } from '../../lib/auth/verifyToken';

const TRIAL_DAYS = 7;

/**
 * POST /api/init-account
 *
 * Called once after a new user's organization is created.
 * Creates a 7-day trial subscription if none exists for the org.
 * Idempotent — safe to call multiple times.
 *
 * Requires: Authorization: Bearer <supabase_access_token>
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await verifyToken(req, res);
  if (!auth) return;
  const { user } = auth;

  try {
    const supabase = getServiceSupabase();

    // Get the user's organization
    const { data: mapping } = await supabase
      .from('user_organization_mapping')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!mapping) {
      return res.status(404).json({ error: 'No organization found for user' });
    }

    const organizationId = mapping.organization_id;

    // Check if a subscription already exists — idempotency guard
    const { data: existing } = await supabase
      .from('subscription')
      .select('id')
      .eq('organization_id', organizationId)
      .single();

    if (existing) {
      return res.status(200).json({ initialized: false, reason: 'subscription_exists' });
    }

    // Create 7-day trial subscription.
    // current_period_end = trial_end_date so entitlement checks are consistent
    // regardless of which column the access guard reads.
    const now = new Date();
    const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    const { error: insertError } = await supabase.from('subscription').insert({
      organization_id: organizationId,
      plan_id: 'starter_monthly',
      tier: 'starter',
      status: 'trialing',
      trial_end_date: trialEnd.toISOString(),
      trial_days: TRIAL_DAYS,
      current_period_start: now.toISOString(),
      current_period_end: trialEnd.toISOString(),
      cancel_at_period_end: false,
    });

    if (insertError) {
      console.error('[init-account] Failed to create trial subscription:', insertError.message);
      return res.status(500).json({ error: 'Failed to initialize trial' });
    }

    console.log(`[init-account] Created ${TRIAL_DAYS}-day trial for org: ${organizationId}`);
    return res.status(200).json({ initialized: true, trial_days: TRIAL_DAYS });

  } catch (error: any) {
    console.error('[init-account] Error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
