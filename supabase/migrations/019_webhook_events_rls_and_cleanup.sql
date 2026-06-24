-- Migration 019: RLS on webhook_events + cleanup index
--
-- Migration 014 created the webhook_events dedup table without RLS enabled.
-- On Supabase, tables in the public schema are accessible to anon/authenticated
-- roles by default unless RLS is explicitly enabled. Without RLS, any
-- unauthenticated caller could enumerate processed webhook IDs via the anon key,
-- leaking information about billing event timing and frequency.
--
-- Since webhook_events is written and read exclusively by the service_role client
-- (server-side only), we enable RLS with a deny-all policy. Service_role bypasses
-- RLS by definition, so server-side operations are unaffected.
--
-- The cleanup index on received_at already exists from migration 014.
-- For production cleanup, run a scheduled DELETE inside a pg_cron job:
--   SELECT cron.schedule('cleanup-webhook-events', '0 3 * * *',
--     $$DELETE FROM webhook_events WHERE received_at < now() - interval '7 days'$$);

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Deny all access to non-service roles. Service_role bypasses RLS.
CREATE POLICY webhook_events_deny_all ON webhook_events
  FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);
