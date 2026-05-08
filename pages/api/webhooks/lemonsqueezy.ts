/**
 * LemonSqueezy Webhook Handler
 *
 * Processes webhook events from LemonSqueezy for subscription lifecycle:
 * - subscription_created
 * - subscription_updated
 * - subscription_cancelled
 * - subscription_resumed
 * - subscription_expired
 * - subscription_payment_success
 * - subscription_payment_failed
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getServiceSupabase } from '../../../lib/supabase';
import { verifyWebhookSignature } from '../../../lib/billing/lemonsqueezy';
import { getPlanByVariantId } from '../../../lib/billing/plans';
import type { SubscriptionStatus, Tier } from '../../../lib/billing/types';

// Disable body parsing to get raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

// ---------------------------------------------------------------------------
// Webhook Handler
// ---------------------------------------------------------------------------

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get raw body for signature verification
    const rawBody = await getRawBody(req);
    const signature = req.headers['x-signature'] as string;

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse webhook payload
    const payload = JSON.parse(rawBody);
    const { meta, data } = payload;
    const eventName = meta.event_name;

    console.log(`[LemonSqueezy Webhook] Received event: ${eventName}`);

    // Route to appropriate handler based on event type
    switch (eventName) {
      case 'subscription_created':
        await handleSubscriptionCreated(data);
        break;

      case 'subscription_updated':
        await handleSubscriptionUpdated(data);
        break;

      case 'subscription_cancelled':
      case 'subscription_expired':
        await handleSubscriptionCancelled(data);
        break;

      case 'subscription_resumed':
        await handleSubscriptionResumed(data);
        break;

      case 'subscription_payment_success':
        await handlePaymentSuccess(data);
        break;

      case 'subscription_payment_failed':
        await handlePaymentFailed(data);
        break;

      default:
        console.log(`[LemonSqueezy Webhook] Unhandled event type: ${eventName}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('[LemonSqueezy Webhook] Error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}

// ---------------------------------------------------------------------------
// Event Handlers
// ---------------------------------------------------------------------------

async function handleSubscriptionCreated(data: any) {
  const supabase = getServiceSupabase();

  const attributes = data.attributes;
  const variantId = attributes.variant_id.toString();
  const organizationId = attributes.custom_data?.organization_id;

  if (!organizationId) {
    console.error('[subscription_created] Missing organization_id in custom_data');
    return;
  }

  // Get plan from variant ID
  const plan = getPlanByVariantId(variantId);
  if (!plan) {
    console.error(`[subscription_created] Unknown variant ID: ${variantId}`);
    return;
  }

  // Insert subscription record
  const { error: subError } = await supabase.from('subscription').insert({
    organization_id: organizationId,
    plan_id: plan.id,
    tier: plan.tier,
    status: mapLemonSqueezyStatus(attributes.status),
    current_period_start: attributes.current_period_start,
    current_period_end: attributes.current_period_end,
    cancel_at_period_end: attributes.cancelled,
    lemonsqueezy_subscription_id: data.id,
    lemonsqueezy_customer_id: attributes.customer_id.toString(),
  });

  if (subError) {
    console.error('[subscription_created] Failed to insert subscription:', subError);
    return;
  }

  // Update organization tier
  await updateOrganizationTier(organizationId, plan.tier);

  console.log(`[subscription_created] Successfully processed for org: ${organizationId}`);
}

async function handleSubscriptionUpdated(data: any) {
  const supabase = getServiceSupabase();

  const attributes = data.attributes;
  const lsSubscriptionId = data.id;

  // Update subscription record
  const { error } = await supabase
    .from('subscription')
    .update({
      status: mapLemonSqueezyStatus(attributes.status),
      current_period_start: attributes.current_period_start,
      current_period_end: attributes.current_period_end,
      cancel_at_period_end: attributes.cancelled,
    })
    .eq('lemonsqueezy_subscription_id', lsSubscriptionId);

  if (error) {
    console.error('[subscription_updated] Failed to update subscription:', error);
  } else {
    console.log(`[subscription_updated] Successfully updated: ${lsSubscriptionId}`);
  }
}

async function handleSubscriptionCancelled(data: any) {
  const supabase = getServiceSupabase();

  const lsSubscriptionId = data.id;

  // Update subscription status
  const { error: subError, data: subData } = await supabase
    .from('subscription')
    .update({
      status: 'cancelled',
      cancel_at_period_end: true,
    })
    .eq('lemonsqueezy_subscription_id', lsSubscriptionId)
    .select('organization_id')
    .single();

  if (subError) {
    console.error('[subscription_cancelled] Failed to update subscription:', subError);
    return;
  }

  // Downgrade organization to starter tier
  if (subData?.organization_id) {
    await updateOrganizationTier(subData.organization_id, 'starter');
  }

  console.log(`[subscription_cancelled] Successfully cancelled: ${lsSubscriptionId}`);
}

async function handleSubscriptionResumed(data: any) {
  const supabase = getServiceSupabase();

  const attributes = data.attributes;
  const lsSubscriptionId = data.id;
  const variantId = attributes.variant_id.toString();

  // Get plan from variant ID
  const plan = getPlanByVariantId(variantId);
  if (!plan) {
    console.error(`[subscription_resumed] Unknown variant ID: ${variantId}`);
    return;
  }

  // Update subscription status
  const { error: subError, data: subData } = await supabase
    .from('subscription')
    .update({
      status: 'active',
      cancel_at_period_end: false,
      tier: plan.tier,
    })
    .eq('lemonsqueezy_subscription_id', lsSubscriptionId)
    .select('organization_id')
    .single();

  if (subError) {
    console.error('[subscription_resumed] Failed to update subscription:', subError);
    return;
  }

  // Restore organization tier
  if (subData?.organization_id) {
    await updateOrganizationTier(subData.organization_id, plan.tier);
  }

  console.log(`[subscription_resumed] Successfully resumed: ${lsSubscriptionId}`);
}

async function handlePaymentSuccess(data: any) {
  console.log(`[payment_success] Payment successful for subscription: ${data.id}`);
  // Optionally update payment history or send confirmation emails
}

async function handlePaymentFailed(data: any) {
  const supabase = getServiceSupabase();

  const lsSubscriptionId = data.id;

  // Update subscription to past_due
  const { error } = await supabase
    .from('subscription')
    .update({
      status: 'past_due',
    })
    .eq('lemonsqueezy_subscription_id', lsSubscriptionId);

  if (error) {
    console.error('[payment_failed] Failed to update subscription:', error);
  }

  console.log(`[payment_failed] Payment failed for subscription: ${lsSubscriptionId}`);
  // TODO: Send email notification to organization admin
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Map LemonSqueezy subscription status to our internal status
 */
function mapLemonSqueezyStatus(lsStatus: string): SubscriptionStatus {
  const statusMap: Record<string, SubscriptionStatus> = {
    on_trial: 'trialing',
    active: 'active',
    paused: 'past_due',
    past_due: 'past_due',
    unpaid: 'past_due',
    cancelled: 'cancelled',
    expired: 'expired',
  };

  return statusMap[lsStatus] || 'cancelled';
}

/**
 * Update organization tier in database
 */
async function updateOrganizationTier(organizationId: string, tier: Tier) {
  const supabase = getServiceSupabase();

  const { error } = await supabase
    .from('organization_tier')
    .upsert(
      {
        organization_id: organizationId,
        tier,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id' }
    );

  if (error) {
    console.error('[updateOrganizationTier] Failed to update tier:', error);
  } else {
    console.log(`[updateOrganizationTier] Updated org ${organizationId} to tier: ${tier}`);
  }
}

/**
 * Get raw body from request stream
 */
function getRawBody(req: NextApiRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      resolve(body);
    });
    req.on('error', reject);
  });
}
