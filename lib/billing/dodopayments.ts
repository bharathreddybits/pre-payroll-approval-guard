/**
 * Dodo Payments Integration
 *
 * Handles checkout creation and webhook verification for Dodo Payments.
 * Webhook event handling lives in pages/api/webhooks/dodopayments.ts.
 */

import DodoPayments from 'dodopayments';
import { getPlanById } from './plans';
import type { PlanId } from './types';

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

function getClient(): DodoPayments {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  if (!apiKey) {
    throw new Error('DODO_PAYMENTS_API_KEY is not configured');
  }

  return new DodoPayments({
    bearerToken: apiKey,
    environment: process.env.DODO_PAYMENTS_ENVIRONMENT === 'live_mode' ? 'live_mode' : 'test_mode',
  });
}

// ---------------------------------------------------------------------------
// Checkout Creation
// ---------------------------------------------------------------------------

export interface CreateCheckoutParams {
  planId: PlanId;
  organizationId: string;
  organizationName: string;
  userEmail: string;
}

export async function createCheckoutSession(params: CreateCheckoutParams) {
  const { planId, organizationId, organizationName, userEmail } = params;

  const plan = getPlanById(planId);
  if (!plan) throw new Error(`Invalid plan ID: ${planId}`);
  if (!plan.dodoProductId) {
    throw new Error(
      `Dodo product ID not configured for plan: ${planId}. ` +
      `Set DODO_PRODUCT_${planId.toUpperCase()} in your environment variables.`
    );
  }

  const client = getClient();

  const session = await client.checkoutSessions.create({
    product_cart: [{ product_id: plan.dodoProductId, quantity: 1 }],
    customer: {
      email: userEmail,
      name: organizationName,
    },
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
    metadata: {
      organization_id: organizationId,
      organization_name: organizationName,
      plan_id: planId,
    },
  } as any);

  return {
    checkoutUrl: (session as any).checkout_url as string,
    sessionId: (session as any).session_id as string,
  };
}

// ---------------------------------------------------------------------------
// Webhook Verification
// ---------------------------------------------------------------------------

/**
 * Verify and parse a Dodo Payments webhook using the Standard Webhooks spec.
 * Returns the parsed event or throws if signature is invalid.
 */
export function verifyAndParseWebhook(
  rawBody: string,
  headers: { 'webhook-id'?: string; 'webhook-signature'?: string; 'webhook-timestamp'?: string },
): any {
  const webhookKey = process.env.DODO_PAYMENTS_WEBHOOK_KEY;
  if (!webhookKey) {
    throw new Error('DODO_PAYMENTS_WEBHOOK_KEY is not configured');
  }

  const client = new DodoPayments({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY || '',
    environment: process.env.DODO_PAYMENTS_ENVIRONMENT === 'live_mode' ? 'live_mode' : 'test_mode',
  });

  return (client as any).webhooks.unwrap(rawBody, {
    headers,
    secret: webhookKey,
  });
}

// ---------------------------------------------------------------------------
// Price Formatting
// ---------------------------------------------------------------------------

export function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(priceInCents / 100);
}
