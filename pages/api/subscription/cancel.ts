import { NextApiRequest, NextApiResponse } from 'next';
import { getServiceSupabase } from '../../../lib/supabase';
import { verifyToken } from '../../../lib/auth/verifyToken';
import DodoPayments from 'dodopayments';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await verifyToken(req, res);
  if (!auth) return;
  const { user } = auth;

  try {
    const supabase = getServiceSupabase();

    // Get the caller's organization
    const { data: mapping } = await supabase
      .from('user_organization_mapping')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();
    if (!mapping) return res.status(403).json({ error: 'No organization found' });

    // Fetch the subscription to get the Dodo subscription ID
    const { data: subscription, error: subError } = await supabase
      .from('subscription')
      .select('dodo_subscription_id, status')
      .eq('organization_id', mapping.organization_id)
      .single();

    if (subError || !subscription) {
      return res.status(404).json({ error: 'No subscription found' });
    }

    if (!subscription.dodo_subscription_id) {
      return res.status(400).json({
        error: 'No active Dodo subscription found',
        message: 'This subscription cannot be managed from here. Please contact support.',
      });
    }

    if (subscription.status === 'cancelled' || subscription.status === 'expired') {
      return res.status(400).json({ error: 'Subscription is already cancelled or expired' });
    }

    const client = new DodoPayments({
      bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
      environment: process.env.DODO_PAYMENTS_ENVIRONMENT === 'live_mode' ? 'live_mode' : 'test_mode',
    });

    await (client.subscriptions as any).update(subscription.dodo_subscription_id, {
      cancel_at_next_billing_date: true,
    });

    // Reflect the pending cancellation locally
    await supabase
      .from('subscription')
      .update({ cancel_at_period_end: true })
      .eq('organization_id', mapping.organization_id);

    return res.status(200).json({ success: true, message: 'Subscription will cancel at period end' });
  } catch (error: any) {
    console.error('[subscription/cancel] Error:', error.message);
    return res.status(500).json({ error: 'Failed to cancel subscription', message: error.message });
  }
}
