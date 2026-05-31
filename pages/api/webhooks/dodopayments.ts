/**
 * Dodo Payments Webhook Handler
 *
 * Processes subscription lifecycle events from Dodo Payments:
 *   subscription.active   — subscription started / resumed
 *   subscription.updated  — any field changed
 *   subscription.renewed  — billing period renewed
 *   subscription.on_hold  — payment failed; waiting for updated method
 *   subscription.cancelled — cancelled; won't renew
 *   subscription.expired  — reached end of term
 *   subscription.failed   — creation failed
 *   payment.succeeded     — payment confirmed
 *   payment.failed        — payment failed
 *
 * Signature verification uses the Standard Webhooks spec (HMAC SHA256).
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getServiceSupabase } from '../../../lib/supabase';
import { getPlanByDodoProductId } from '../../../lib/billing/plans';
import type { SubscriptionStatus, Tier } from '../../../lib/billing/types';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let rawBody: string;
  try {
    rawBody = await readRawBody(req);
  } catch {
    return res.status(400).json({ error: 'Failed to read request body' });
  }

  // Verify signature using Standard Webhooks spec
  const webhookKey = process.env.DODO_PAYMENTS_WEBHOOK_KEY;
  if (webhookKey) {
    const id = req.headers['webhook-id'] as string;
    const timestamp = req.headers['webhook-timestamp'] as string;
    const signature = req.headers['webhook-signature'] as string;

    if (!id || !timestamp || !signature) {
      return res.status(401).json({ error: 'Missing webhook signature headers' });
    }

    const isValid = verifySignature(rawBody, id, timestamp, signature, webhookKey);
    if (!isValid) {
      console.error('[dodo-webhook] Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
  } else {
    console.warn('[dodo-webhook] DODO_PAYMENTS_WEBHOOK_KEY not set — skipping signature check');
  }

  let event: { type: string; data: any };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  console.log(`[dodo-webhook] Received: ${event.type}`);

  try {
    switch (event.type) {
      case 'subscription.active':
        await handleSubscriptionActive(event.data);
        break;
      case 'subscription.renewed':
        await handleSubscriptionRenewed(event.data);
        break;
      case 'subscription.updated':
        await handleSubscriptionUpdated(event.data);
        break;
      case 'subscription.on_hold':
        await handleSubscriptionOnHold(event.data);
        break;
      case 'subscription.cancelled':
      case 'subscription.expired':
      case 'subscription.failed':
        await handleSubscriptionEnded(event.data, event.type);
        break;
      case 'payment.succeeded':
      case 'payment.failed':
        // Logged for observability; subscription events carry the actionable state
        console.log(`[dodo-webhook] Payment event: ${event.type}`);
        break;
      default:
        console.log(`[dodo-webhook] Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('[dodo-webhook] Handler error:', error.message);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

async function handleSubscriptionActive(data: any) {
  const supabase = getServiceSupabase();
  const organizationId = data.metadata?.organization_id;
  const planId = data.metadata?.plan_id;

  if (!organizationId) {
    console.error('[subscription.active] Missing organization_id in metadata');
    return;
  }

  // Resolve tier from product ID or plan_id metadata
  const plan = data.product_id
    ? getPlanByDodoProductId(data.product_id)
    : undefined;
  const tier: Tier = (plan?.tier ?? (planId?.startsWith('pro') ? 'pro' : 'starter')) as Tier;

  const nextBilling = data.next_billing_date ? new Date(data.next_billing_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // Upsert subscription — idempotent on dodo_subscription_id
  const { error } = await supabase.from('subscription').upsert(
    {
      organization_id: organizationId,
      plan_id: plan?.id ?? planId ?? 'starter_monthly',
      tier,
      status: 'active' as SubscriptionStatus,
      current_period_start: new Date().toISOString(),
      current_period_end: nextBilling.toISOString(),
      cancel_at_period_end: data.cancel_at_next_billing_date ?? false,
      lemonsqueezy_subscription_id: null,
      lemonsqueezy_customer_id: null,
    },
    { onConflict: 'organization_id' },
  );

  if (error) {
    console.error('[subscription.active] DB upsert failed:', error.message);
    return;
  }

  await updateOrganizationTier(organizationId, tier);
  console.log(`[subscription.active] org=${organizationId} tier=${tier}`);
}

async function handleSubscriptionRenewed(data: any) {
  const supabase = getServiceSupabase();
  const organizationId = data.metadata?.organization_id;
  if (!organizationId) return;

  const nextBilling = data.next_billing_date ? new Date(data.next_billing_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await supabase
    .from('subscription')
    .update({
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: nextBilling.toISOString(),
      cancel_at_period_end: data.cancel_at_next_billing_date ?? false,
    })
    .eq('organization_id', organizationId);

  console.log(`[subscription.renewed] org=${organizationId}`);
}

async function handleSubscriptionUpdated(data: any) {
  const supabase = getServiceSupabase();
  const organizationId = data.metadata?.organization_id;
  if (!organizationId) return;

  const plan = data.product_id ? getPlanByDodoProductId(data.product_id) : undefined;
  const updates: Record<string, any> = {
    cancel_at_period_end: data.cancel_at_next_billing_date ?? false,
  };
  if (plan) {
    updates.plan_id = plan.id;
    updates.tier = plan.tier;
  }
  if (data.next_billing_date) {
    updates.current_period_end = new Date(data.next_billing_date).toISOString();
  }

  await supabase.from('subscription').update(updates).eq('organization_id', organizationId);

  if (plan) await updateOrganizationTier(organizationId, plan.tier);
  console.log(`[subscription.updated] org=${organizationId}`);
}

async function handleSubscriptionOnHold(data: any) {
  const supabase = getServiceSupabase();
  const organizationId = data.metadata?.organization_id;
  if (!organizationId) return;

  await supabase
    .from('subscription')
    .update({ status: 'past_due' })
    .eq('organization_id', organizationId);

  console.log(`[subscription.on_hold] org=${organizationId} — marked past_due`);
}

async function handleSubscriptionEnded(data: any, eventType: string) {
  const supabase = getServiceSupabase();
  const organizationId = data.metadata?.organization_id;
  if (!organizationId) return;

  const status: SubscriptionStatus = eventType === 'subscription.expired' ? 'expired' : 'cancelled';

  await supabase
    .from('subscription')
    .update({ status, cancel_at_period_end: true })
    .eq('organization_id', organizationId);

  // Downgrade to starter on cancel/expire
  await updateOrganizationTier(organizationId, 'starter');
  console.log(`[${eventType}] org=${organizationId} — downgraded to starter`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function updateOrganizationTier(organizationId: string, tier: Tier) {
  const supabase = getServiceSupabase();
  const { error } = await supabase
    .from('organization_tier')
    .upsert(
      { organization_id: organizationId, tier, updated_at: new Date().toISOString() },
      { onConflict: 'organization_id' },
    );
  if (error) console.error('[updateOrganizationTier]', error.message);
}

/**
 * Standard Webhooks HMAC SHA256 verification.
 * Signed string: "{webhook-id}.{webhook-timestamp}.{body}"
 */
function verifySignature(
  body: string,
  webhookId: string,
  timestamp: string,
  signatureHeader: string,
  secret: string,
): boolean {
  try {
    const crypto = require('crypto');
    const toSign = `${webhookId}.${timestamp}.${body}`;
    const hmac = crypto.createHmac('sha256', Buffer.from(secret, 'base64'));
    const digest = hmac.update(toSign).digest('base64');
    const expected = `v1,${digest}`;

    // Header may contain multiple comma-separated signatures
    const signatures = signatureHeader.split(' ');
    return signatures.some((sig) => sig === expected);
  } catch {
    return false;
  }
}

function readRawBody(req: NextApiRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk.toString(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}
