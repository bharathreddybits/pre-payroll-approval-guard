-- Migration 015: Revoke over-broad GRANT on organization table
--
-- NEW-012: Migration 008 issued GRANT ALL ON public.organization TO anon, authenticated.
-- Granting ALL to the anon role means unauthenticated callers have INSERT/UPDATE/DELETE
-- access on the organization table, subject only to RLS. A single RLS policy gap
-- or a SECURITY DEFINER function bypass would expose all organizations to anonymous
-- writes. Defense-in-depth requires matching the permission scope to actual need.
--
-- The service_role key (used only server-side) retains full access via its
-- built-in bypass. Only authenticated users need SELECT for UI reads.

REVOKE ALL ON public.organization FROM anon;
REVOKE ALL ON public.organization FROM authenticated;

-- Re-grant minimal required permissions
GRANT SELECT ON public.organization TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.organization TO service_role;

-- Same cleanup for organization_tier (same over-broad pattern from migration 008)
REVOKE ALL ON public.organization_tier FROM anon;
GRANT SELECT ON public.organization_tier TO authenticated;
