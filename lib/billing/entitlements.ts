/**
 * Entitlement Checking & Enforcement
 *
 * This module provides functions to check and enforce entitlements
 * based on organization tier.
 */

import { getServiceSupabase } from '../supabase';
import { Tier, Entitlement, EntitlementCheckResult, TierLimits } from './types';
import { getTierLimits, TIER_LIMITS } from './plans';

// ---------------------------------------------------------------------------
// Get Organization Tier
// ---------------------------------------------------------------------------

/**
 * Look up the subscription tier for an organization.
 * Defaults to 'starter' if no tier record exists.
 */
export async function getOrganizationTier(organizationId: string): Promise<Tier> {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from('organization_tier')
    .select('tier')
    .eq('organization_id', organizationId)
    .single();

  const tier = data?.tier;
  if (tier === 'pro') return 'pro';
  return 'starter';
}

// ---------------------------------------------------------------------------
// Get Full Entitlements
// ---------------------------------------------------------------------------

/**
 * Get complete entitlements for an organization including limits and trial status.
 */
export async function getEntitlements(organizationId: string): Promise<Entitlement> {
  const supabase = getServiceSupabase();
  const tier = await getOrganizationTier(organizationId);
  const limits = getTierLimits(tier);

  // Check subscription table for trial status
  const { data: subscription } = await supabase
    .from('subscription')
    .select('*')
    .eq('organization_id', organizationId)
    .single();

  let isTrialing = false;
  let validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // Default: 1 year from now

  if (subscription) {
    isTrialing = subscription.status === 'trialing';

    // Use trial_end_date if trialing, otherwise use current_period_end
    if (isTrialing && subscription.trial_end_date) {
      validUntil = new Date(subscription.trial_end_date);
    } else if (subscription.current_period_end) {
      validUntil = new Date(subscription.current_period_end);
    }
  }

  return {
    organizationId,
    tier,
    limits,
    validUntil,
    isTrialing,
  };
}

/**
 * Check if an organization has an active subscription or valid trial.
 * Returns detailed status information.
 */
export async function checkSubscriptionAccess(organizationId: string): Promise<{
  hasAccess: boolean;
  status: 'active' | 'trialing' | 'expired' | 'none';
  daysRemaining?: number;
  trialEnded?: boolean;
  needsSubscription?: boolean;
}> {
  const supabase = getServiceSupabase();

  const { data: subscription } = await supabase
    .from('subscription')
    .select('*')
    .eq('organization_id', organizationId)
    .single();

  // No subscription exists
  if (!subscription) {
    return {
      hasAccess: false,
      status: 'none',
      needsSubscription: true,
    };
  }

  const now = new Date();
  const status = subscription.status;

  // Active subscription - has access
  if (status === 'active') {
    const periodEnd = new Date(subscription.current_period_end);
    const daysRemaining = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      hasAccess: true,
      status: 'active',
      daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
    };
  }

  // Trialing subscription - check if trial expired
  if (status === 'trialing') {
    const trialEnd = subscription.trial_end_date ? new Date(subscription.trial_end_date) : null;

    if (!trialEnd) {
      // No trial end date set - shouldn't happen, but allow access
      return { hasAccess: true, status: 'trialing' };
    }

    const isExpired = trialEnd <= now;
    const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (isExpired) {
      return {
        hasAccess: false,
        status: 'expired',
        trialEnded: true,
        needsSubscription: true,
        daysRemaining: 0,
      };
    }

    return {
      hasAccess: true,
      status: 'trialing',
      daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
    };
  }

  // Expired or cancelled - no access
  if (status === 'expired' || status === 'cancelled') {
    return {
      hasAccess: false,
      status: 'expired',
      needsSubscription: true,
    };
  }

  // Past due - allow access but flag
  if (status === 'past_due') {
    return {
      hasAccess: true, // Allow access during grace period
      status: 'active',
      daysRemaining: 0,
    };
  }

  // Default: no access
  return {
    hasAccess: false,
    status: 'expired',
    needsSubscription: true,
  };
}

// ---------------------------------------------------------------------------
// Entitlement Checks
// ---------------------------------------------------------------------------

/**
 * Check if an organization can have a certain number of employees.
 */
export async function checkEmployeeLimit(
  organizationId: string,
  employeeCount: number,
): Promise<EntitlementCheckResult> {
  const tier = await getOrganizationTier(organizationId);
  const limits = getTierLimits(tier);

  if (employeeCount <= limits.maxEmployees) {
    return { allowed: true };
  }

  const tierLabel = tier === 'pro' ? 'Pro' : 'Starter';
  return {
    allowed: false,
    reason: `${tierLabel} plan supports up to ${limits.maxEmployees} employees. You have ${employeeCount}.`,
    upgradeRequired: true,
    currentValue: employeeCount,
    limit: limits.maxEmployees,
  };
}

/**
 * Check if flexible CSV import is available.
 */
export async function checkFlexibleImport(organizationId: string): Promise<EntitlementCheckResult> {
  const tier = await getOrganizationTier(organizationId);
  const limits = getTierLimits(tier);

  if (limits.flexibleImport) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'Flexible CSV import requires Pro plan.',
    upgradeRequired: true,
  };
}

/**
 * Check if AI column mapping is available.
 */
export async function checkAiMapping(organizationId: string): Promise<EntitlementCheckResult> {
  const tier = await getOrganizationTier(organizationId);
  const limits = getTierLimits(tier);

  if (limits.aiMapping) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'AI-powered column mapping requires Pro plan.',
    upgradeRequired: true,
  };
}

/**
 * Check if organization can access multiple organizations.
 */
export async function checkMultiOrg(
  organizationId: string,
  currentOrgCount: number,
): Promise<EntitlementCheckResult> {
  const tier = await getOrganizationTier(organizationId);
  const limits = getTierLimits(tier);

  if (limits.multiOrg || currentOrgCount < limits.maxOrganizations) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Starter plan supports ${limits.maxOrganizations} organization. Upgrade to Pro for multi-organization support.`,
    upgradeRequired: true,
    currentValue: currentOrgCount,
    limit: limits.maxOrganizations,
  };
}

/**
 * Generic feature check by feature name.
 */
export async function checkFeature(
  organizationId: string,
  feature: keyof TierLimits,
  value?: number,
): Promise<EntitlementCheckResult> {
  const tier = await getOrganizationTier(organizationId);
  const limits = getTierLimits(tier);
  const limit = limits[feature];

  // Boolean feature
  if (typeof limit === 'boolean') {
    if (limit) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `${feature} requires Pro plan.`,
      upgradeRequired: true,
    };
  }

  // Numeric limit
  if (typeof limit === 'number' && typeof value === 'number') {
    if (value <= limit) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `Limit exceeded: ${value} > ${limit}`,
      upgradeRequired: true,
      currentValue: value,
      limit,
    };
  }

  return { allowed: true };
}

// ---------------------------------------------------------------------------
// Convenience Exports
// ---------------------------------------------------------------------------

export { TIER_LIMITS, getTierLimits, isFeatureAvailable } from './plans';
