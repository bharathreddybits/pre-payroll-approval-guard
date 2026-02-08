/**
 * Billing & Entitlements Module
 *
 * Centralized exports for all billing-related functionality.
 */

// Types
export type {
  Tier,
  PlanId,
  SubscriptionStatus,
  PricingPlan,
  Subscription,
  TierLimits,
  Entitlement,
  EntitlementCheckResult,
} from './types';

// Plans & Limits
export {
  TIER_LIMITS,
  PLANS,
  LEMONSQUEEZY_VARIANT_TO_PLAN,
  getTierLimits,
  getPlanById,
  getPlanByVariantId,
  isFeatureAvailable,
} from './plans';

// Entitlements
export {
  getOrganizationTier,
  getEntitlements,
  checkEmployeeLimit,
  checkFlexibleImport,
  checkAiMapping,
  checkMultiOrg,
  checkFeature,
} from './entitlements';
