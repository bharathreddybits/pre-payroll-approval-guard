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
  getTierLimits,
  getPlanById,
  getPlanByDodoProductId,
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
