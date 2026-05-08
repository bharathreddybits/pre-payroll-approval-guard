/**
 * Cancel Subscription API
 *
 * Cancels a LemonSqueezy subscription (at the end of the billing period)
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { cancelLemonSqueezySubscription } from '../../../lib/billing/lemonsqueezy';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subscriptionId } = req.body;

    // Validate required fields
    if (!subscriptionId) {
      return res.status(400).json({
        error: 'Missing required field: subscriptionId',
      });
    }

    // Cancel subscription via LemonSqueezy
    await cancelLemonSqueezySubscription(subscriptionId);

    return res.status(200).json({
      success: true,
      message: 'Subscription cancelled successfully',
    });
  } catch (error: any) {
    console.error('Subscription cancellation failed:', error);
    return res.status(500).json({
      error: 'Failed to cancel subscription',
      message: error.message,
    });
  }
}
