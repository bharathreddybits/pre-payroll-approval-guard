/**
 * Billing & Entitlements Type Definitions
 */

export type Tier = 'starter' | 'pro';

export type PlanId = 'starter_monthly' | 'starter_annual' | 'pro_monthly' | 'pro_annual';

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired' | 'failed';

export interface PricingPlan {
  id: PlanId;
  tier: Tier;
  name: string;
  interval: 'month' | 'year';
  /** Price in cents */
  price: number;
  /** Dodo Payments product ID */
  dodoProductId?: string;
}

export interface Subscription {
  id: string;
  organizationId: string;
  planId: PlanId;
  tier: Tier;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  /** Dodo Payments subscription ID */
  dodoSubscriptionId?: string;
  /** Dodo Payments customer ID */
  dodoCustomerId?: string;
}

export interface TierLimits {
  maxEmployees: number;
  maxOrganizations: number;
  flexibleImport: boolean;
  aiMapping: boolean;
  fullRules: boolean;
  multiOrg: boolean;
}

export interface Entitlement {
  organizationId: string;
  tier: Tier;
  limits: TierLimits;
  validUntil: Date;
  isTrialing: boolean;
}

export interface EntitlementCheckResult {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: boolean;
  currentValue?: number;
  limit?: number;
}
