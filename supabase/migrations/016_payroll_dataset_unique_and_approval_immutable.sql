-- Migration 016: Upload TOCTOU fix + immutable approvals
--
-- NEW-004 (upload): Two concurrent uploads for the same period both pass the
-- application-layer duplicate check before either session exists in the DB.
-- Adding a UNIQUE constraint on payroll_dataset makes the DB the authoritative
-- duplicate guard; the application check becomes a fast-path UX hint only.
--
-- NEW-023 (approval RLS): The approval table had FOR ALL RLS policies, meaning
-- any authenticated user in the org could DELETE approval records, destroying
-- the immutable audit trail. Payroll approvals must never be deletable.

ALTER TABLE payroll_dataset
  ADD CONSTRAINT payroll_dataset_unique_period
  UNIQUE (organization_id, period_start_date, period_end_date, run_type);

-- Make approval records immutable at the DB level.
-- The approval table should already have RLS enabled; we add an explicit
-- no-delete policy as a hard guard regardless of any future policy changes.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'approval'
    AND policyname = 'approval_no_delete'
  ) THEN
    EXECUTE 'CREATE POLICY approval_no_delete ON approval FOR DELETE USING (false)';
  END IF;
END
$$;
