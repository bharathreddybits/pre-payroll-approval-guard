-- Migration 004: Rename 'free' tier to 'starter', remove 'enterprise'
-- Both tiers (starter, pro) now have 7-day free trials

-- 1. Update existing 'free' rows to 'starter'
UPDATE organization_tier SET tier = 'starter' WHERE tier = 'free';

-- 2. Drop old constraint and add new one with only starter/pro
ALTER TABLE organization_tier DROP CONSTRAINT IF EXISTS organization_tier_tier_check;
ALTER TABLE organization_tier
  ADD CONSTRAINT organization_tier_tier_check
  CHECK (tier IN ('starter', 'pro'));

-- 3. Update default value
ALTER TABLE organization_tier
  ALTER COLUMN tier SET DEFAULT 'starter';
