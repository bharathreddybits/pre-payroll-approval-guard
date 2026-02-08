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
  const tier = await getOrganizationTier(organizationId);
  const limits = getTierLimits(tier);

  // TODO: Check subscription table for trial status when billing is integrated
  const isTrialing = false;
  const validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now

  return {
    organizationId,
    tier,
    limits,
    validUntil,
    isTrialing,
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

  return {
    allowed: false,
    reason: `Starter plan supports up to ${limits.maxEmployees} employees. You have ${employeeCount}.`,
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
