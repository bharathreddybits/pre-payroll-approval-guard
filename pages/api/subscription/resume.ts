import { NextApiRequest, NextApiResponse } from 'next';
import DodoPayments from 'dodopayments';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subscriptionId } = req.body;
    if (!subscriptionId) {
      return res.status(400).json({ error: 'Missing required field: subscriptionId' });
    }

    const client = new DodoPayments({
      bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
      environment: process.env.DODO_PAYMENTS_ENVIRONMENT === 'live_mode' ? 'live_mode' : 'test_mode',
    });

    // Reactivate by updating cancel_at_next_billing_date to false
    await (client.subscriptions as any).update(subscriptionId, {
      cancel_at_next_billing_date: false,
    });

    return res.status(200).json({ success: true, message: 'Subscription resumed successfully' });
  } catch (error: any) {
    console.error('[subscription/resume] Error:', error.message);
    return res.status(500).json({ error: 'Failed to resume subscription', message: error.message });
  }
}
