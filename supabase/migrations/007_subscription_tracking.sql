-- Subscription Tracking for LemonSqueezy Integration
-- Stores subscription details and links them to organizations

-- Create subscription table
CREATE TABLE IF NOT EXISTS public.subscription (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organization(organization_id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('starter', 'pro')),
  status TEXT NOT NULL CHECK (status IN ('trialing', 'active', 'past_due', 'cancelled', 'expired')),
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  lemonsqueezy_subscription_id TEXT UNIQUE,
  lemonsqueezy_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_organization ON public.subscription(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscription_ls_id ON public.subscription(lemonsqueezy_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_status ON public.subscription(status);

-- Enable RLS
ALTER TABLE public.subscription ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their organization's subscriptions
CREATE POLICY "Users can view their organization's subscription"
  ON public.subscription
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_user
      WHERE user_id = auth.uid()
    )
  );

-- Service role can manage all subscriptions (for webhooks)
CREATE POLICY "Service role can manage all subscriptions"
  ON public.subscription
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscription_update_timestamp
  BEFORE UPDATE ON public.subscription
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_timestamp();

-- Comments for documentation
COMMENT ON TABLE public.subscription IS 'Tracks subscription plans and status for organizations';
COMMENT ON COLUMN public.subscription.plan_id IS 'Internal plan identifier (e.g., starter_monthly, pro_annual)';
COMMENT ON COLUMN public.subscription.tier IS 'Current subscription tier affecting feature access';
COMMENT ON COLUMN public.subscription.status IS 'Subscription status from LemonSqueezy';
COMMENT ON COLUMN public.subscription.lemonsqueezy_subscription_id IS 'LemonSqueezy subscription ID for API calls';
COMMENT ON COLUMN public.subscription.lemonsqueezy_customer_id IS 'LemonSqueezy customer ID';
