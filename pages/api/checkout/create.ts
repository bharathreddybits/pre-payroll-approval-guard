import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getServiceSupabase } from '../../../lib/supabase';
import { createCheckoutSession } from '../../../lib/billing/dodopayments';
import type { PlanId } from '../../../lib/billing/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth: require Bearer token
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authorization required' });

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

  try {
    const { planId, organizationId, organizationName } = req.body;

    if (!planId || !organizationId || !organizationName) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['planId', 'organizationId', 'organizationName'],
      });
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
