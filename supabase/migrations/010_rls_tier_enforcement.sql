-- ============================================================================
-- RLS Hardening: user_organization_mapping
-- ============================================================================
-- The user_organization_mapping table was not protected by RLS, meaning any
-- authenticated user could enumerate all user→org relationships in the system.
-- This migration closes that gap.

-- Enable RLS
ALTER TABLE public.user_organization_mapping ENABLE ROW LEVEL SECURITY;

-- Users can only read their own org memberships
CREATE POLICY "Users can view their own org memberships"
  ON public.user_organization_mapping
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert themselves into an org (used by AuthContext on signup)
CREATE POLICY "Users can insert their own org membership"
  ON public.user_organization_mapping
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Service role can manage all mappings (for admin operations)
CREATE POLICY "Service role can manage all org mappings"
  ON public.user_organization_mapping
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
