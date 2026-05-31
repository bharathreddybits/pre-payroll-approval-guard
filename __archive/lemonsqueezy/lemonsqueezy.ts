/**
 * LemonSqueezy API Integration
 *
 * Handles checkout creation, subscription management, and webhook processing
 * for LemonSqueezy billing integration.
 */

import {
  lemonSqueezySetup,
  createCheckout,
  getSubscription,
  updateSubscription,
  cancelSubscription,
  type NewCheckout,
} from '@lemonsqueezy/lemonsqueezy.js';
import { getPlanById, PLANS } from './plans';
import type { PlanId } from './types';

// Initialize LemonSqueezy SDK
const apiKey = process.env.LEMONSQUEEZY_API_KEY;
if (!apiKey) {
  console.warn('LEMONSQUEEZY_API_KEY not configured - billing features disabled');
} else {
  lemonSqueezySetup({ apiKey });
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export const LEMONSQUEEZY_CONFIG = {
  storeId: process.env.LEMONSQUEEZY_STORE_ID || '',
  webhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET || '',
  webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/lemonsqueezy`,
};

// ---------------------------------------------------------------------------
// Checkout Creation
// ---------------------------------------------------------------------------

export interface CreateCheckoutParams {
  planId: PlanId;
  organizationId: string;
  organizationName: string;
  userEmail: string;
}

/**
 * Create a LemonSqueezy checkout session for a subscription plan
 */
export async function createCheckoutSession(params: CreateCheckoutParams) {
  const { planId, organizationId, organizationName, userEmail } = params;

  const plan = getPlanById(planId);
  if (!plan) {
    throw new Error(`Invalid plan ID: ${planId}`);
  }

  if (!plan.lemonSqueezyVariantId) {
    throw new Error(`LemonSqueezy variant ID not configured for plan: ${planId}`);
  }

  const checkoutData: NewCheckout = {
    productOptions: {
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
    },
    checkoutOptions: {
      embed: false,
      media: false,
      logo: true,
    },
    checkoutData: {
      email: userEmail,
      custom: {
        organization_id: organizationId,
        organization_name: organizationName,
        plan_id: planId,
      },
    },
    expiresAt: null,
    preview: false,
    testMode: process.env.NODE_ENV !== 'production',
  };

  try {
    const result = await createCheckout(
      LEMONSQUEEZY_CONFIG.storeId,
      plan.lemonSqueezyVariantId,
      checkoutData
    );

    if (result.error) {
      throw new Error(`LemonSqueezy checkout creation failed: ${result.error.message}`);
    }

    return {
      checkoutUrl: result.data?.data.attributes.url,
      checkoutId: result.data?.data.id,
    };
  } catch (error) {
    console.error('Failed to create LemonSqueezy checkout:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Subscription Management
// ---------------------------------------------------------------------------

/**
 * Get subscription details from LemonSqueezy
 */
export async function getLemonSqueezySubscription(subscriptionId: string) {
  try {
    const result = await getSubscription(subscriptionId);

    if (result.error) {
      throw new Error(`Failed to fetch subscription: ${result.error.message}`);
    }

    return result.data?.data;
  } catch (error) {
    console.error('Failed to get LemonSqueezy subscription:', error);
    throw error;
  }
}

/**
 * Cancel a subscription (at period end)
 */
export async function cancelLemonSqueezySubscription(subscriptionId: string) {
  try {
    const result = await cancelSubscription(subscriptionId);

    if (result.error) {
      throw new Error(`Failed to cancel subscription: ${result.error.message}`);
    }

    return result.data?.data;
  } catch (error) {
    console.error('Failed to cancel LemonSqueezy subscription:', error);
    throw error;
  }
}

/**
 * Resume a cancelled subscription
 */
export async function resumeLemonSqueezySubscription(subscriptionId: string) {
  try {
    const result = await updateSubscription(subscriptionId, {
      cancelled: false,
    });

    if (result.error) {
      throw new Error(`Failed to resume subscription: ${result.error.message}`);
    }

    return result.data?.data;
  } catch (error) {
    console.error('Failed to resume LemonSqueezy subscription:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Webhook Signature Verification
// ---------------------------------------------------------------------------

/**
 * Verify LemonSqueezy webhook signature
 * Prevents unauthorized webhook calls
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!LEMONSQUEEZY_CONFIG.webhookSecret) {
    console.warn('LEMONSQUEEZY_WEBHOOK_SECRET not configured - webhook verification disabled');
    return true; // Allow in development
  }

  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', LEMONSQUEEZY_CONFIG.webhookSecret);
  const digest = hmac.update(rawBody).digest('hex');

  return digest === signature;
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Format price from cents to display format
 */
export function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(priceInCents / 100);
}

/**
 * Get all plans with formatted prices
 */
export function getFormattedPlans() {
  return Object.values(PLANS).map((plan) => ({
    ...plan,
    priceFormatted: formatPrice(plan.price),
    pricePerMonth:
      plan.interval === 'year'
        ? formatPrice(plan.price / 12)
        : formatPrice(plan.price),
  }));
}
