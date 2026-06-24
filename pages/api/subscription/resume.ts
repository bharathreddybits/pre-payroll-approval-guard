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
      .select('dodo_subscription_id, status, cancel_at_period_end')
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

    if (!subscription.cancel_at_period_end) {
      return res.status(400).json({
        error: 'Subscription is not pending cancellation',
        message: 'This subscription is already set to renew automatically.',
      });
    }

    const client = new DodoPayments({
      bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
      environment: process.env.DODO_PAYMENTS_ENVIRONMENT === 'live_mode' ? 'live_mode' : 'test_mode',
    });

    await (client.subscriptions as any).update(subscription.dodo_subscription_id, {
      cancel_at_next_billing_date: false,
    });

    // Reflect the resume locally
    await supabase
      .from('subscription')
      .update({ cancel_at_period_end: false })
      .eq('organization_id', mapping.organization_id);

    return res.status(200).json({ success: true, message: 'Subscription resumed successfully' });
  } catch (error: any) {
    console.error('[subscription/resume] Error:', error.message);
    return res.status(500).json({ error: 'Failed to resume subscription', message: error.message });
  }
}
