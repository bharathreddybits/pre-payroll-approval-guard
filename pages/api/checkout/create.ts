/**
 * Create Checkout Session API
 *
 * Creates a LemonSqueezy checkout session for a subscription plan
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createCheckoutSession } from '../../../lib/billing/lemonsqueezy';
import type { PlanId } from '../../../lib/billing/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { planId, organizationId, organizationName, userEmail } = req.body;

    // Validate required fields
    if (!planId || !organizationId || !organizationName || !userEmail) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['planId', 'organizationId', 'organizationName', 'userEmail'],
      });
    }

    // Create checkout session
    const checkout = await createCheckoutSession({
      planId: planId as PlanId,
      organizationId,
      organizationName,
      userEmail,
    });

    return res.status(200).json({
      checkoutUrl: checkout.checkoutUrl,
      checkoutId: checkout.checkoutId,
    });
  } catch (error: any) {
    console.error('Checkout creation failed:', error);
    return res.status(500).json({
      error: 'Failed to create checkout session',
      message: error.message,
    });
  }
}
