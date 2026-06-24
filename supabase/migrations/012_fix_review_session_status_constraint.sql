-- Migration 012: Fix review_session status CHECK constraint
--
-- The original constraint in migration 002 only allowed:
--   IN ('in_progress', 'reviewed', 'completed')
--
-- Application code uses two additional values:
--   'pending_mapping' — set in upload.ts when Pro tier user needs column mapping
--   'failed'          — set in upload.ts and confirm-mapping.ts on processing error
--   'approved'        — set in approve.ts when a payroll run is approved
--   'rejected'        — set in approve.ts when a payroll run is rejected (kept as 'reviewed')
--
-- Without this fix, any Pro tier upload attempt silently fails with a Postgres
-- CHECK constraint violation when the upload handler tries to set status='pending_mapping'.
-- The error is caught and swallowed, leaving the session stuck in 'in_progress'.

ALTER TABLE review_session
  DROP CONSTRAINT IF EXISTS review_session_status_check;

ALTER TABLE review_session
  ADD CONSTRAINT review_session_status_check
  CHECK (status IN ('in_progress', 'pending_mapping', 'reviewed', 'completed', 'approved', 'failed'));

COMMENT ON COLUMN review_session.status IS
  'in_progress: uploading | pending_mapping: awaiting Pro column mapping | reviewed: user viewed results | completed: processing done | approved: payroll approved | failed: processing error';
