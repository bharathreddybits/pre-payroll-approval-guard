-- Migration 013: Enforce approval uniqueness at the database level
--
-- SEC-003 / DI-004: The approval table had no UNIQUE constraint on review_session_id.
-- Without this, two concurrent approval requests could both pass the application-layer
-- "already finalized?" check (TOCTOU race), then race to insert/update approval rows
-- with conflicting statuses, corrupting the immutable audit trail.
--
-- This constraint is the authoritative enforcement; application-layer idempotency checks
-- become the fast-path fallback rather than the sole guard.

ALTER TABLE approval
  ADD CONSTRAINT approval_review_session_id_unique
  UNIQUE (review_session_id);
