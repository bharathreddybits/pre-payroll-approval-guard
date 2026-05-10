import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getServiceSupabase } from '../../lib/supabase';

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

  try {
    // Verify the caller's Supabase session
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

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

    // Create 7-day trial subscription
    const now = new Date();
    const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { error: insertError } = await supabase.from('subscription').insert({
      organization_id: organizationId,
      plan_id: 'starter_monthly',
      tier: 'starter',
      status: 'trialing',
      trial_end_date: trialEnd.toISOString(),
      trial_days: TRIAL_DAYS,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
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
