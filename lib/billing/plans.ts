/**
 * Pricing Plans Configuration
 *
 * Single source of truth for all plan definitions and limits.
 * Used by both frontend (pricing page) and backend (enforcement).
 *
 * dodoProductId values come from DODO_PAYMENTS_PRODUCT_* env vars set after
 * running: node scripts/setup-dodo-products.mjs
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
    price: 24900,
    dodoProductId: process.env.DODO_PRODUCT_STARTER_MONTHLY,
  },
  starter_annual: {
    id: 'starter_annual',
    tier: 'starter',
    name: 'Starter Annual',
    interval: 'year',
    price: 238800,
    dodoProductId: process.env.DODO_PRODUCT_STARTER_ANNUAL,
  },
  pro_monthly: {
    id: 'pro_monthly',
    tier: 'pro',
    name: 'Pro Monthly',
    interval: 'month',
    price: 74900,
    dodoProductId: process.env.DODO_PRODUCT_PRO_MONTHLY,
  },
  pro_annual: {
    id: 'pro_annual',
    tier: 'pro',
    name: 'Pro Annual',
    interval: 'year',
    price: 718800,
    dodoProductId: process.env.DODO_PRODUCT_PRO_ANNUAL,
  },
};

// ---------------------------------------------------------------------------
// Dodo Product ID → Plan mapping (for webhook routing)
// ---------------------------------------------------------------------------

export function getPlanByDodoProductId(productId: string): PricingPlan | undefined {
  return Object.values(PLANS).find((p) => p.dodoProductId === productId);
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

export function getTierLimits(tier: Tier): TierLimits {
  return TIER_LIMITS[tier] || TIER_LIMITS.starter;
}

export function getPlanById(planId: string): PricingPlan | undefined {
  return PLANS[planId];
}

// Mapping from legacy snake_case feature names to new camelCase
const LEGACY_FEATURE_MAP: Record<string, keyof TierLimits> = {
  flexible_import: 'flexibleImport',
  ai_mapping: 'aiMapping',
  full_rules: 'fullRules',
  multi_org: 'multiOrg',
};

export function isFeatureAvailable(tier: Tier, feature: string): boolean {
  const limits = getTierLimits(tier);
  const normalizedFeature = LEGACY_FEATURE_MAP[feature] || feature;
  const value = limits[normalizedFeature as keyof TierLimits];

  if (value === undefined) {
    console.warn(`Unknown feature: ${feature}`);
    return false;
  }

  if (typeof value === 'boolean') return value;
  return value > 0;
}
