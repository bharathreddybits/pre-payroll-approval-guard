-- Migration 017: Denormalized delta/judgement counts on review_session
--
-- NEW-008: The dashboard endpoint was loading all payroll_delta rows for all
-- sessions on the current page to compute counts, materializing potentially
-- hundreds of thousands of rows in Node.js memory per request.
--
-- Adding denormalized count columns to review_session makes dashboard queries
-- O(1) per session — no delta/judgement tables need to be touched at read time.
-- These columns are updated by the persistence layer at the end of each
-- processing run (see lib/payroll/persistence.ts updateSessionCounts).

ALTER TABLE review_session
  ADD COLUMN IF NOT EXISTS delta_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS material_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS blocker_count INTEGER NOT NULL DEFAULT 0;
