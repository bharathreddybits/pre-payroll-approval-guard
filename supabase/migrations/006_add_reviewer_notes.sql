-- ============================================================================
-- PayrollShield Schema - v006
-- Adds reviewer_notes column to material_judgement for audit trail.
-- ============================================================================

ALTER TABLE material_judgement
  ADD COLUMN IF NOT EXISTS reviewer_notes TEXT;

COMMENT ON COLUMN material_judgement.reviewer_notes IS 'Free-text notes from the reviewer documenting actions taken or findings';
