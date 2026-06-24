-- Migration 018: Maximum length constraints on user-supplied text fields
--
-- NEW-016: approval_notes had no length limit. A 1MB string would be stored and
-- returned in every dashboard response that includes approval data.
--
-- NEW-019: reviewer_notes on material_judgement had no length limit. Oversized
-- notes inflate every review page response for all future loads of that session.

ALTER TABLE approval
  ADD CONSTRAINT approval_notes_max_length
  CHECK (approval_notes IS NULL OR length(approval_notes) <= 2000);

ALTER TABLE material_judgement
  ADD CONSTRAINT reviewer_notes_max_length
  CHECK (reviewer_notes IS NULL OR length(reviewer_notes) <= 5000);
