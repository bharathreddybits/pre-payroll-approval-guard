/**
 * Tier Gating Module (Legacy)
 *
 * This module re-exports from the new billing module for backwards compatibility.
 * New code should import directly from '@/lib/billing'.
 *
 * @deprecated Use `import { ... } from '@/lib/billing'` instead
 */

// Re-export types and functions from billing module
export type { Tier, TierLimits } from './billing/types';

export {
  getOrganizationTier,
  isFeatureAvailable,
  TIER_LIMITS,
  getTierLimits,
} from './billing';

// Legacy Feature type for backwards compatibility
export type Feature = 'flexible_import' | 'ai_mapping' | 'full_rules';
