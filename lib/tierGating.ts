import { getServiceSupabase } from './supabase';

export type Tier = 'free' | 'pro' | 'enterprise';

export type Feature =
  | 'flexible_import'
  | 'ai_mapping'
  | 'full_rules';

const FEATURE_TIERS: Record<Feature, Tier[]> = {
  flexible_import: ['pro', 'enterprise'],
  ai_mapping: ['pro', 'enterprise'],
  full_rules: ['pro', 'enterprise'],
};

/**
 * Look up the subscription tier for an organization.
 * Defaults to 'free' if no tier record exists.
 */
export async function getOrganizationTier(organizationId: string): Promise<Tier> {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from('organization_tier')
    .select('tier')
    .eq('organization_id', organizationId)
    .single();

  return (data?.tier as Tier) || 'free';
}

/**
 * Check whether a feature is available for a given tier.
 */
export function isFeatureAvailable(tier: Tier, feature: Feature): boolean {
  return FEATURE_TIERS[feature].includes(tier);
}
