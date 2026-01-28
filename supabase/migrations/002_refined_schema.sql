-- ============================================================================
-- Pre-Payroll Approval Guard - Refined Data Model
-- Based on user's preferred model + critical fixes for SaaS/audit requirements
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. ORGANIZATION (Multi-Tenant Support)
-- ============================================================================
CREATE TABLE organization (
    organization_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE organization IS 'Multi-tenant organization records for SaaS customers';

-- ============================================================================
-- 2. REVIEW_SESSION (Core Session Entity)
-- ============================================================================
CREATE TABLE review_session (
    review_session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_by UUID, -- References auth.users (Supabase Auth)
    status TEXT CHECK (status IN ('in_progress', 'reviewed', 'completed')) DEFAULT 'in_progress'
);

COMMENT ON TABLE review_session IS 'Tracks a single payroll review session (one upload of baseline + current)';
COMMENT ON COLUMN review_session.status IS 'in_progress: uploaded | reviewed: user viewed | completed: approved/rejected';

-- ============================================================================
-- 3. PAYROLL_DATASET (Uploaded Datasets)
-- ============================================================================
CREATE TABLE payroll_dataset (
    dataset_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_session_id UUID NOT NULL REFERENCES review_session(review_session_id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE CASCADE,
    dataset_type TEXT CHECK (dataset_type IN ('baseline', 'current')) NOT NULL,
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    pay_date DATE NOT NULL,
    run_type TEXT CHECK (run_type IN ('regular', 'off_cycle')) DEFAULT 'regular',
    upload_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    row_count INTEGER,
    CONSTRAINT unique_dataset_per_session UNIQUE (review_session_id, dataset_type)
);

COMMENT ON TABLE payroll_dataset IS 'Stores metadata for each uploaded payroll dataset (baseline vs current)';
COMMENT ON COLUMN payroll_dataset.dataset_type IS 'baseline: previously approved payroll | current: new payroll to review';
COMMENT ON COLUMN payroll_dataset.run_type IS 'regular: standard payroll cycle | off_cycle: bonus, correction, etc.';

-- ============================================================================
-- 4. EMPLOYEE_PAY_RECORD (Employee Pay Records)
-- ============================================================================
CREATE TABLE employee_pay_record (
    record_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES payroll_dataset(dataset_id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL,
    employee_name TEXT,
    department TEXT,
    employment_status TEXT,
    gross_pay NUMERIC(10, 2),
    net_pay NUMERIC(10, 2),
    total_deductions NUMERIC(10, 2),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE employee_pay_record IS 'Individual employee pay records within a dataset';
COMMENT ON COLUMN employee_pay_record.metadata IS 'Optional JSONB for flexible fields (hours_worked, rate, etc.)';

-- ============================================================================
-- 5. PAY_COMPONENT (Scalable Pay Breakdown)
-- ============================================================================
CREATE TABLE pay_component (
    component_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id UUID NOT NULL REFERENCES employee_pay_record(record_id) ON DELETE CASCADE,
    component_name TEXT NOT NULL,
    component_type TEXT CHECK (component_type IN ('earning', 'deduction', 'tax')) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE pay_component IS 'Explains how gross pay becomes net pay; scalable to diverse CSV schemas';
COMMENT ON COLUMN pay_component.component_type IS 'earning: adds to gross | deduction: subtracts | tax: subtracts';

-- ============================================================================
-- 6. PAYROLL_DELTA (Derived Delta Records - Persistent)
-- ============================================================================
CREATE TABLE payroll_delta (
    delta_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_session_id UUID NOT NULL REFERENCES review_session(review_session_id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL,
    metric TEXT CHECK (metric IN ('net_pay', 'gross_pay', 'total_deductions', 'component')) NOT NULL,
    component_name TEXT,
    baseline_value NUMERIC(10, 2),
    current_value NUMERIC(10, 2),
    delta_absolute NUMERIC(10, 2),
    delta_percentage NUMERIC(5, 2),
    change_type TEXT CHECK (change_type IN ('increase', 'decrease', 'new_employee', 'removed_employee', 'no_change')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE payroll_delta IS 'Stores computed deltas between baseline and current datasets (persistent)';
COMMENT ON COLUMN payroll_delta.metric IS 'net_pay | gross_pay | total_deductions | component';
COMMENT ON COLUMN payroll_delta.component_name IS 'If metric=component, stores which component changed';

-- ============================================================================
-- 7. MATERIAL_JUDGEMENT (Deterministic Rule Results)
-- ============================================================================
CREATE TABLE material_judgement (
    judgement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delta_id UUID NOT NULL REFERENCES payroll_delta(delta_id) ON DELETE CASCADE,
    is_material BOOLEAN NOT NULL,
    is_blocker BOOLEAN DEFAULT FALSE,
    confidence_score NUMERIC(3, 2),
    reasoning TEXT NOT NULL,
    rule_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE material_judgement IS 'Stores deterministic judgement results';
COMMENT ON COLUMN material_judgement.rule_id IS 'Rule identifier (e.g., R001_NEGATIVE_NET_PAY)';

-- ============================================================================
-- 8. APPROVAL (Audit Trail)
-- ============================================================================
CREATE TABLE approval (
    approval_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_session_id UUID NOT NULL REFERENCES review_session(review_session_id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE CASCADE,
    approved_by UUID,
    approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    approval_notes TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE approval IS 'Approval audit trail: who approved, when, why';

-- ============================================================================
-- 9. USER_ORGANIZATION_MAPPING (For RLS)
-- ============================================================================
CREATE TABLE user_organization_mapping (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organization(organization_id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('viewer', 'approver', 'admin')) DEFAULT 'approver',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, organization_id)
);

COMMENT ON TABLE user_organization_mapping IS 'Maps Supabase Auth users to organizations with roles';

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_review_session_org ON review_session(organization_id, created_at DESC);
CREATE INDEX idx_payroll_dataset_session ON payroll_dataset(review_session_id);
CREATE INDEX idx_employee_pay_record_dataset ON employee_pay_record(dataset_id);
CREATE INDEX idx_employee_pay_record_employee_id ON employee_pay_record(employee_id);
CREATE INDEX idx_pay_component_record ON pay_component(record_id);
CREATE INDEX idx_payroll_delta_session ON payroll_delta(review_session_id);
CREATE INDEX idx_payroll_delta_employee ON payroll_delta(employee_id);
CREATE INDEX idx_material_judgement_delta ON material_judgement(delta_id);
CREATE INDEX idx_material_judgement_blocker ON material_judgement(is_blocker) WHERE is_blocker = TRUE;
CREATE INDEX idx_approval_session ON approval(review_session_id);
CREATE INDEX idx_approval_org_date ON approval(organization_id, approved_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE organization ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_dataset ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_pay_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay_component ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_delta ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_judgement ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users access own organization"
    ON organization FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_mapping
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users access own org review sessions"
    ON review_session FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_mapping
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users access own org datasets"
    ON payroll_dataset FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_mapping
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users access own org employee records"
    ON employee_pay_record FOR ALL
    USING (
        dataset_id IN (
            SELECT dataset_id FROM payroll_dataset
            WHERE organization_id IN (
                SELECT organization_id FROM user_organization_mapping
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users access own org pay components"
    ON pay_component FOR ALL
    USING (
        record_id IN (
            SELECT record_id FROM employee_pay_record
            WHERE dataset_id IN (
                SELECT dataset_id FROM payroll_dataset
                WHERE organization_id IN (
                    SELECT organization_id FROM user_organization_mapping
                    WHERE user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Users access own org deltas"
    ON payroll_delta FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_mapping
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users access own org judgements"
    ON material_judgement FOR ALL
    USING (
        delta_id IN (
            SELECT delta_id FROM payroll_delta
            WHERE organization_id IN (
                SELECT organization_id FROM user_organization_mapping
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users access own org approvals"
    ON approval FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_mapping
            WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- VIEWS FOR DASHBOARD
-- ============================================================================

CREATE VIEW latest_review_sessions AS
SELECT
    rs.review_session_id,
    rs.organization_id,
    o.organization_name,
    rs.status,
    rs.created_at,
    COUNT(DISTINCT pd.delta_id) AS total_changes,
    COUNT(DISTINCT mj.judgement_id) FILTER (WHERE mj.is_material = TRUE) AS material_changes,
    COUNT(DISTINCT mj.judgement_id) FILTER (WHERE mj.is_blocker = TRUE) AS blockers,
    a.approval_status,
    a.approved_at,
    a.approved_by
FROM review_session rs
JOIN organization o ON rs.organization_id = o.organization_id
LEFT JOIN payroll_delta pd ON rs.review_session_id = pd.review_session_id
LEFT JOIN material_judgement mj ON pd.delta_id = mj.delta_id
LEFT JOIN approval a ON rs.review_session_id = a.review_session_id
GROUP BY rs.review_session_id, o.organization_name, rs.status, rs.created_at, a.approval_status, a.approved_at, a.approved_by
ORDER BY rs.created_at DESC;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to organization table
CREATE TRIGGER update_organization_updated_at
    BEFORE UPDATE ON organization
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
