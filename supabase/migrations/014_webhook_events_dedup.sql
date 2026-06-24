-- Migration 014: Webhook event deduplication table
--
-- NEW-002: Dodo Payments retries webhooks on 500 responses. Without tracking
-- processed webhook IDs, a retry after a partial DB write could re-apply the
-- same subscription event and corrupt billing state (e.g., reset period_start
-- to "now" on a renewal that already succeeded).
--
-- This table stores the webhook-id from the Standard Webhooks spec header.
-- Before processing any event, the handler inserts the webhook-id; on conflict
-- it returns 200 immediately (idempotent). Records are retained for 7 days
-- to cover Dodo's maximum retry window, then can be cleaned up.

CREATE TABLE IF NOT EXISTS webhook_events (
  webhook_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhook_events_received_at_idx
  ON webhook_events (received_at);
