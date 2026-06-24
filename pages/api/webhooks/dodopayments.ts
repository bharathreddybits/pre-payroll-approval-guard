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

import crypto from 'crypto';
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

  // Verify signature using Standard Webhooks spec — key is mandatory
  const webhookKey = process.env.DODO_PAYMENTS_WEBHOOK_KEY;
  if (!webhookKey) {
    console.error('[dodo-webhook] DODO_PAYMENTS_WEBHOOK_KEY is not configured');
    return res.status(500).json({ error: 'Webhook verification not configured' });
  }

  const id = req.headers['webhook-id'] as string;
  const timestamp = req.headers['webhook-timestamp'] as string;
  const signature = req.headers['webhook-signature'] as string;

  if (!id || !timestamp || !signature) {
    return res.status(401).json({ error: 'Missing webhook signature headers' });
  }

  // Reject replays: timestamp must be within ±5 minutes
  const tsSeconds = parseInt(timestamp, 10);
  if (isNaN(tsSeconds) || Math.abs(Date.now() / 1000 - tsSeconds) > 300) {
    console.error('[dodo-webhook] Rejected stale or invalid timestamp:', timestamp);
    return res.status(401).json({ error: 'Webhook timestamp out of range' });
  }

  const isValid = verifySignature(rawBody, id, timestamp, signature, webhookKey);
  if (!isValid) {
    console.error('[dodo-webhook] Invalid signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Idempotency: deduplicate on webhook-id (Standard Webhooks spec).
  // Dodo retries on 5xx — without dedup, a retry after a partial DB write
  // would re-apply the same event and could corrupt subscription state.
  const supabaseForDedup = getServiceSupabase();
  let event: { type: string; data: any };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  const { error: dedupError } = await supabaseForDedup
    .from('webhook_events')
    .insert({ webhook_id: id, event_type: event.type });

  if (dedupError) {
    if (dedupError.code === '23505') {
      // Duplicate key — this event was already processed successfully
      console.log(`[dodo-webhook] Duplicate webhook-id=${id}, returning 200 (idempotent)`);
      return res.status(200).json({ received: true, duplicate: true });
    }
    // Non-duplicate DB error: return 500 so Dodo retries when the DB is healthy.
    // Continuing past a dedup failure could allow duplicate billing state mutations
    // if the same webhook arrives again before the DB error resolves.
    console.error('[dodo-webhook] Dedup insert failed (non-duplicate):', dedupError.message);
    return res.status(500).json({ error: 'Webhook deduplication unavailable — please retry' });
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
        await handleSubscriptionEnded(event.data, event.type);
        break;
      case 'subscription.failed':
        // subscription.failed = subscription CREATION failed — the customer never had a
        // subscription. Treating it like cancelled/expired would downgrade an org that
        // may have another valid subscription row or may just be retrying checkout.
        // Only mark the subscription status as 'failed' without changing the tier.
        await handleSubscriptionCreationFailed(event.data);
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

  // Resolve tier from product ID or plan_id metadata.
  // If neither resolves, throw so Dodo retries the event — we must not silently
  // set a Pro subscriber to Starter tier due to a missing product_id.
  const plan = data.product_id
    ? getPlanByDodoProductId(data.product_id)
    : undefined;

  let tier: Tier;
  if (plan?.tier) {
    tier = plan.tier;
  } else if (planId?.startsWith('pro')) {
    tier = 'pro';
  } else if (planId) {
    tier = 'starter';
  } else {
    throw new Error(`[subscription.active] Cannot resolve tier for org=${organizationId} — product_id and plan_id metadata both missing`);
  }

  const nextBilling = data.next_billing_date ? new Date(data.next_billing_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // Don't downgrade an existing active pro subscription
  const { data: existing } = await supabase
    .from('subscription')
    .select('tier, status')
    .eq('organization_id', organizationId)
    .single();
  if (existing?.tier === 'pro' && existing?.status === 'active' && tier === 'starter') {
    console.warn(`[subscription.active] Refusing to downgrade org=${organizationId} from pro to starter — missing product_id in webhook`);
    return;
  }

  // Upsert subscription — idempotent on organization_id
  const { error } = await supabase.from('subscription').upsert(
    {
      organization_id: organizationId,
      plan_id: plan?.id ?? planId ?? 'starter_monthly',
      tier,
      status: 'active' as SubscriptionStatus,
      current_period_start: new Date().toISOString(),
      current_period_end: nextBilling.toISOString(),
      cancel_at_period_end: data.cancel_at_next_billing_date ?? false,
      dodo_subscription_id: data.subscription_id ?? null,
      dodo_customer_id: data.customer_id ?? null,
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

  // Read current tier before updating so we can sync organization_tier afterward
  const { data: existingSub } = await supabase
    .from('subscription')
    .select('tier')
    .eq('organization_id', organizationId)
    .single();
  const tier: Tier = (existingSub?.tier ?? 'starter') as Tier;

  await supabase
    .from('subscription')
    .update({
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: nextBilling.toISOString(),
      cancel_at_period_end: data.cancel_at_next_billing_date ?? false,
      ...(data.subscription_id ? { dodo_subscription_id: data.subscription_id } : {}),
    })
    .eq('organization_id', organizationId);

  // Sync organization_tier to keep both tables consistent — all other handlers
  // call updateOrganizationTier; renewal was the only handler that did not.
  await updateOrganizationTier(organizationId, tier);
  console.log(`[subscription.renewed] org=${organizationId} tier=${tier}`);
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

async function handleSubscriptionCreationFailed(data: any) {
  // subscription.failed fires when the *creation* of a new subscription fails —
  // e.g., card declined at checkout. The customer may not have an existing subscription
  // row at all (first purchase attempt). Only update the status to 'failed' if a row
  // already exists; do NOT downgrade the tier or set cancel_at_period_end because
  // the customer may retry checkout immediately.
  const supabase = getServiceSupabase();
  const organizationId = data.metadata?.organization_id;
  if (!organizationId) {
    console.warn('[subscription.failed] Missing organization_id — skipping');
    return;
  }

  const { error } = await supabase
    .from('subscription')
    .update({ status: 'failed' as SubscriptionStatus })
    .eq('organization_id', organizationId)
    .eq('status', 'active'); // Only update if currently active to avoid clobbering a trialing row

  if (error) {
    console.error('[subscription.failed] DB update failed:', error.message);
  }
  console.log(`[subscription.failed] org=${organizationId} — marked failed (no tier downgrade)`);
}

async function handleSubscriptionEnded(data: any, eventType: string) {
  const supabase = getServiceSupabase();
  const organizationId = data.metadata?.organization_id;
  if (!organizationId) return;

  const status: SubscriptionStatus = eventType === 'subscription.expired' ? 'expired' : 'cancelled';

  // cancel_at_period_end: false — subscription is already fully terminated,
  // this flag has no meaning and showing it as true would render a spurious
  // "Resume Subscription" button on the subscription management page.
  await supabase
    .from('subscription')
    .update({ status, cancel_at_period_end: false })
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
  if (error) {
    // Throw so the webhook returns 500 and Dodo retries — tier divergence between
    // subscription.tier and organization_tier.tier would cause billing/access mismatch.
    throw new Error(`[updateOrganizationTier] Failed for org=${organizationId}: ${error.message}`);
  }
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
  // Dodo secrets are prefixed with "whsec_"; strip it before base64-decoding
  const secretBase64 = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  const secretBytes = Buffer.from(secretBase64, 'base64');
  const toSign = `${webhookId}.${timestamp}.${body}`;
  const digest = crypto.createHmac('sha256', secretBytes).update(toSign).digest('base64');
  const expected = `v1,${digest}`;

  // Header may contain multiple space-separated signatures (during secret rotation).
  // Use timingSafeEqual to prevent timing side-channel attacks — an attacker who
  // can measure response latency could otherwise forge signatures character-by-character.
  const expectedBuf = Buffer.from(expected, 'utf-8');
  return signatureHeader.split(' ').some((sig) => {
    const sigBuf = Buffer.from(sig, 'utf-8');
    if (sigBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expectedBuf);
  });
}

const MAX_WEBHOOK_BODY_BYTES = 1 * 1024 * 1024; // 1 MB — Dodo webhook payloads are ~10 KB max

function readRawBody(req: NextApiRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    let byteCount = 0;
    req.on('data', (chunk: Buffer) => {
      byteCount += chunk.length;
      if (byteCount > MAX_WEBHOOK_BODY_BYTES) {
        reject(new Error(`Webhook body exceeds ${MAX_WEBHOOK_BODY_BYTES} byte limit`));
        req.destroy();
        return;
      }
      body += chunk.toString();
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}
