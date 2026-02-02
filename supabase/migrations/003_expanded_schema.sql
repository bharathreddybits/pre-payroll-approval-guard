-- ============================================================================
-- PayrollShield Schema Expansion - v003
-- Adds canonical payroll fields, column mapping audit, and tier tracking.
-- All new columns are nullable — existing data is unaffected.
-- ============================================================================

-- ============================================================================
-- 1. EXPAND employee_pay_record with canonical fields
-- ============================================================================

ALTER TABLE employee_pay_record
  ADD COLUMN IF NOT EXISTS pay_group TEXT,
  ADD COLUMN IF NOT EXISTS pay_frequency TEXT,
  ADD COLUMN IF NOT EXISTS regular_hours NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS other_paid_hours NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS total_hours_worked NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS base_earnings NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS overtime_pay NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS bonus_earnings NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS other_earnings NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS federal_income_tax NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS social_security_tax NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS medicare_tax NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS state_income_tax NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS local_tax NUMERIC(10,2);

COMMENT ON COLUMN employee_pay_record.pay_group IS 'Pay group or classification';
COMMENT ON COLUMN employee_pay_record.pay_frequency IS 'Weekly, Bi-weekly, Semi-monthly, Monthly';
COMMENT ON COLUMN employee_pay_record.regular_hours IS 'Regular hours worked';
COMMENT ON COLUMN employee_pay_record.overtime_hours IS 'Overtime hours worked';
COMMENT ON COLUMN employee_pay_record.other_paid_hours IS 'PTO, vacation, sick, holiday hours';
COMMENT ON COLUMN employee_pay_record.total_hours_worked IS 'Total hours (regular + OT + other)';
COMMENT ON COLUMN employee_pay_record.base_earnings IS 'Base/regular earnings';
COMMENT ON COLUMN employee_pay_record.overtime_pay IS 'Overtime earnings';
COMMENT ON COLUMN employee_pay_record.bonus_earnings IS 'Bonus or incentive earnings';
COMMENT ON COLUMN employee_pay_record.other_earnings IS 'Other/miscellaneous earnings';
COMMENT ON COLUMN employee_pay_record.federal_income_tax IS 'Federal income tax withheld';
COMMENT ON COLUMN employee_pay_record.social_security_tax IS 'Social Security (OASDI) tax';
COMMENT ON COLUMN employee_pay_record.medicare_tax IS 'Medicare tax withheld';
COMMENT ON COLUMN employee_pay_record.state_income_tax IS 'State income tax withheld';
COMMENT ON COLUMN employee_pay_record.local_tax IS 'Local/city/county tax withheld';

-- ============================================================================
-- 2. EXPAND payroll_delta metric constraint
-- ============================================================================

ALTER TABLE payroll_delta DROP CONSTRAINT IF EXISTS payroll_delta_metric_check;
ALTER TABLE payroll_delta ADD CONSTRAINT payroll_delta_metric_check
  CHECK (metric IN (
    'net_pay', 'gross_pay', 'total_deductions', 'component',
    'regular_hours', 'overtime_hours', 'other_paid_hours', 'total_hours_worked',
    'base_earnings', 'overtime_pay', 'bonus_earnings', 'other_earnings',
    'federal_income_tax', 'social_security_tax', 'medicare_tax',
    'state_income_tax', 'local_tax'
  ));

-- ============================================================================
-- 3. COLUMN MAPPING TABLE (audit trail for AI-mapped columns)
-- ============================================================================

CREATE TABLE IF NOT EXISTS column_mapping (
  mapping_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_session_id UUID NOT NULL REFERENCES review_session(review_session_id) ON DELETE CASCADE,
  dataset_type TEXT CHECK (dataset_type IN ('baseline', 'current')) NOT NULL,
  uploaded_column TEXT NOT NULL,
  canonical_field TEXT,
  confidence NUMERIC(3,2),
  reasoning TEXT,
  user_override TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE column_mapping IS 'Stores AI column mapping results per review session for audit';
COMMENT ON COLUMN column_mapping.user_override IS 'If user manually changed the AI suggestion';

CREATE INDEX IF NOT EXISTS idx_column_mapping_session
  ON column_mapping(review_session_id);

-- RLS for column_mapping
ALTER TABLE column_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own org column mappings"
  ON column_mapping FOR ALL
  USING (
    review_session_id IN (
      SELECT review_session_id FROM review_session
      WHERE organization_id IN (
        SELECT organization_id FROM user_organization_mapping
        WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- 4. ORGANIZATION TIER TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS organization_tier (
  organization_id UUID PRIMARY KEY REFERENCES organization(organization_id) ON DELETE CASCADE,
  tier TEXT CHECK (tier IN ('free', 'pro', 'enterprise')) DEFAULT 'free' NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE organization_tier IS 'Tracks subscription tier per organization for feature gating';

-- RLS for organization_tier
ALTER TABLE organization_tier ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own org tier"
  ON organization_tier FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organization_mapping
      WHERE user_id = auth.uid()
    )
  );

-- Auto-create free tier entry for existing organizations
INSERT INTO organization_tier (organization_id, tier)
SELECT organization_id, 'free'
FROM organization
WHERE organization_id NOT IN (SELECT organization_id FROM organization_tier)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. ADD status for mapping step to review_session
-- ============================================================================

ALTER TABLE review_session DROP CONSTRAINT IF EXISTS review_session_status_check;
ALTER TABLE review_session ADD CONSTRAINT review_session_status_check
  CHECK (status IN ('pending_mapping', 'in_progress', 'reviewed', 'completed'));
