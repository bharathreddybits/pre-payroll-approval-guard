import { NextApiRequest, NextApiResponse } from 'next';
import { getServiceSupabase } from '../../../lib/supabase';
import { verifyToken } from '../../../lib/auth/verifyToken';
import { createCheckoutSession } from '../../../lib/billing/dodopayments';
import { PLANS } from '../../../lib/billing/plans';
import type { PlanId } from '../../../lib/billing/types';

const VALID_PLAN_IDS = new Set<string>(Object.keys(PLANS));

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await verifyToken(req, res);
  if (!auth) return;
  const { user } = auth;

  try {
    const { planId, organizationId, organizationName } = req.body;

    if (!planId || !organizationId || !organizationName) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['planId', 'organizationId', 'organizationName'],
      });
    }

    // Allowlist planId against known plan keys — reject unknown or crafted values
    // before they reach the Dodo Payments API, which would return a confusing error.
    if (!VALID_PLAN_IDS.has(planId)) {
      return res.status(400).json({ error: 'Invalid planId' });
    }

    // userEmail always comes from the verified JWT — never from client body
    const userEmail = user.email;
    if (!userEmail) {
      return res.status(400).json({ error: 'Authenticated user has no email address' });
    }

    // Verify the organizationId belongs to the authenticated user
    const supabase = getServiceSupabase();
    const { data: mapping } = await supabase
      .from('user_organization_mapping')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();
    if (!mapping) return res.status(403).json({ error: 'No organization found' });
    if (mapping.organization_id !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
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
