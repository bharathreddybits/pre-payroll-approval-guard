-- Add Dodo Payments columns to subscription table
-- The lemonsqueezy_* columns are left in place (nullable) so existing data isn't lost.
-- New rows from Dodo Payments will use the dodo_* columns instead.

ALTER TABLE public.subscription
  ADD COLUMN IF NOT EXISTS dodo_subscription_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS dodo_customer_id TEXT;

CREATE INDEX IF NOT EXISTS idx_subscription_dodo_id
  ON public.subscription(dodo_subscription_id)
  WHERE dodo_subscription_id IS NOT NULL;

COMMENT ON COLUMN public.subscription.dodo_subscription_id IS 'Dodo Payments subscription ID';
COMMENT ON COLUMN public.subscription.dodo_customer_id IS 'Dodo Payments customer ID';
