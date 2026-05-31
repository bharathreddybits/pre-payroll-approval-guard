import { NextApiRequest, NextApiResponse } from 'next';
import { createCheckoutSession } from '../../../lib/billing/dodopayments';
import type { PlanId } from '../../../lib/billing/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { planId, organizationId, organizationName, userEmail } = req.body;

    if (!planId || !organizationId || !organizationName || !userEmail) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['planId', 'organizationId', 'organizationName', 'userEmail'],
      });
    }

    const checkout = await createCheckoutSession({
      planId: planId as PlanId,
      organizationId,
      organizationName,
      userEmail,
    });

    return res.status(200).json({
      checkoutUrl: checkout.checkoutUrl,
      sessionId: checkout.sessionId,
    });
  } catch (error: any) {
    console.error('[checkout/create] Error:', error.message);
    return res.status(500).json({
      error: 'Failed to create checkout session',
      message: error.message,
    });
  }
}
