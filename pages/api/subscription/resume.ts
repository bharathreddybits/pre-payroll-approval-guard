/**
 * Resume Subscription API
 *
 * Resumes a cancelled LemonSqueezy subscription
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { resumeLemonSqueezySubscription } from '../../../lib/billing/lemonsqueezy';

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

    // Resume subscription via LemonSqueezy
    await resumeLemonSqueezySubscription(subscriptionId);

    return res.status(200).json({
      success: true,
      message: 'Subscription resumed successfully',
    });
  } catch (error: any) {
    console.error('Subscription resume failed:', error);
    return res.status(500).json({
      error: 'Failed to resume subscription',
      message: error.message,
    });
  }
}
