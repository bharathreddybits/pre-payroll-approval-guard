import { getServiceSupabase } from './supabase';

export type Tier = 'starter' | 'pro';

export type Feature =
  | 'flexible_import'
  | 'ai_mapping'
  | 'full_rules';

const FEATURE_TIERS: Record<Feature, Tier[]> = {
  flexible_import: ['pro'],
  ai_mapping: ['pro'],
  full_rules: ['pro'],
};

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

/**
 * Check whether a feature is available for a given tier.
 */
export function isFeatureAvailable(tier: Tier, feature: Feature): boolean {
  return FEATURE_TIERS[feature].includes(tier);
}
