/**
 * Pricing Plans Configuration
 *
 * Single source of truth for all plan definitions and limits.
 * This file is used by both frontend (pricing page) and backend (enforcement).
 */

import { PricingPlan, Tier, TierLimits } from './types';

// ---------------------------------------------------------------------------
// Plan Limits by Tier
// ---------------------------------------------------------------------------

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  starter: {
    maxEmployees: 100,
    maxOrganizations: 1,
    flexibleImport: false,
    aiMapping: false,
    fullRules: false,
    multiOrg: false,
  },
  pro: {
    maxEmployees: Infinity,
    maxOrganizations: Infinity,
    flexibleImport: true,
    aiMapping: true,
    fullRules: true,
    multiOrg: true,
  },
};

// ---------------------------------------------------------------------------
// Pricing Plans
// ---------------------------------------------------------------------------

export const PLANS: Record<string, PricingPlan> = {
  starter_monthly: {
    id: 'starter_monthly',
    tier: 'starter',
    name: 'Starter Monthly',
    interval: 'month',
    price: 24900, // $249.00 in cents
    lemonSqueezyVariantId: '1624079',
  },
  starter_annual: {
    id: 'starter_annual',
    tier: 'starter',
    name: 'Starter Annual',
    interval: 'year',
    price: 238800, // $199/mo * 12 = $2,388 in cents
    lemonSqueezyVariantId: '1624164',
  },
  pro_monthly: {
    id: 'pro_monthly',
    tier: 'pro',
    name: 'Pro Monthly',
    interval: 'month',
    price: 74900, // $749.00 in cents
    lemonSqueezyVariantId: '1624168',
  },
  pro_annual: {
    id: 'pro_annual',
    tier: 'pro',
    name: 'Pro Annual',
    interval: 'year',
    price: 718800, // $599/mo * 12 = $7,188 in cents
    lemonSqueezyVariantId: '1624171',
  },
};

// ---------------------------------------------------------------------------
// LemonSqueezy Variant Mapping (to be filled after LS integration)
// ---------------------------------------------------------------------------

/**
 * Maps LemonSqueezy variant_id to internal plan ID.
 * Configured for Store ID: 288054 (payrollshield.lemonsqueezy.com)
 */
export const LEMONSQUEEZY_VARIANT_TO_PLAN: Record<string, string> = {
  '1624079': 'starter_monthly',
  '1624164': 'starter_annual',
  '1624168': 'pro_monthly',
  '1624171': 'pro_annual',
};

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Get tier limits for a given tier
 */
export function getTierLimits(tier: Tier): TierLimits {
  return TIER_LIMITS[tier] || TIER_LIMITS.starter;
}

/**
 * Get plan by ID
 */
export function getPlanById(planId: string): PricingPlan | undefined {
  return PLANS[planId];
}

/**
 * Get plan by LemonSqueezy variant ID
 */
export function getPlanByVariantId(variantId: string): PricingPlan | undefined {
  const planId = LEMONSQUEEZY_VARIANT_TO_PLAN[variantId];
  return planId ? PLANS[planId] : undefined;
}

// Mapping from legacy snake_case feature names to new camelCase
const LEGACY_FEATURE_MAP: Record<string, keyof TierLimits> = {
  flexible_import: 'flexibleImport',
  ai_mapping: 'aiMapping',
  full_rules: 'fullRules',
  multi_org: 'multiOrg',
};

/**
 * Check if a feature is available for a tier.
 * Supports both legacy snake_case names and new camelCase names.
 */
export function isFeatureAvailable(tier: Tier, feature: string): boolean {
  const limits = getTierLimits(tier);

  // Map legacy feature names to new format
  const normalizedFeature = LEGACY_FEATURE_MAP[feature] || feature;

  const value = limits[normalizedFeature as keyof TierLimits];

  if (value === undefined) {
    console.warn(`Unknown feature: ${feature}`);
    return false;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  // For numeric limits, return true if limit is > 0
  return value > 0;
}
