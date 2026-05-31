-- ============================================================
-- PENDING MIGRATIONS — paste this entire file into the
-- Supabase SQL Editor and click Run.
-- Safe to re-run (all statements are idempotent).
-- ============================================================

-- ── Migration 011: Add Dodo Payments columns ─────────────────
-- (from supabase/migrations/011_dodo_payments_columns.sql)

ALTER TABLE public.subscription
  ADD COLUMN IF NOT EXISTS dodo_subscription_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS dodo_customer_id TEXT;

CREATE INDEX IF NOT EXISTS idx_subscription_dodo_id
  ON public.subscription(dodo_subscription_id)
  WHERE dodo_subscription_id IS NOT NULL;

COMMENT ON COLUMN public.subscription.dodo_subscription_id IS 'Dodo Payments subscription ID';
COMMENT ON COLUMN public.subscription.dodo_customer_id IS 'Dodo Payments customer ID';

-- ── Trial fix: reset expired trial subscriptions ─────────────
-- Extends any expired or trialing-but-past-end subscriptions
-- to a fresh 7-day window so the account is usable again.

UPDATE public.subscription
SET
  trial_end_date    = NOW() + INTERVAL '7 days',
  status            = 'trialing',
  current_period_end = NOW() + INTERVAL '7 days'
WHERE status IN ('trialing', 'expired')
  AND (trial_end_date IS NULL OR trial_end_date < NOW());

-- ── Backfill: create starter trials for orgs without any subscription ──
-- Inserts a trialing record for every org that has no subscription row.

INSERT INTO public.subscription (
  organization_id,
  plan_id,
  tier,
  status,
  trial_end_date,
  current_period_start,
  current_period_end,
  cancel_at_period_end
)
SELECT
  o.organization_id,
  'starter_monthly',
  'starter',
  'trialing',
  NOW() + INTERVAL '7 days',
  NOW(),
  NOW() + INTERVAL '7 days',
  false
FROM public.organization o
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscription s
  WHERE s.organization_id = o.organization_id
);

-- ── Verify ────────────────────────────────────────────────────
SELECT
  s.organization_id,
  o.organization_name,
  s.status,
  s.tier,
  s.trial_end_date,
  s.dodo_subscription_id
FROM public.subscription s
JOIN public.organization o USING (organization_id)
ORDER BY s.created_at DESC;
