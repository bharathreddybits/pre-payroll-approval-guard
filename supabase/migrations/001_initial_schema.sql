-- Pre-Payroll Approval Guard - Initial Schema
-- This migration sets up the core tables for payroll snapshot tracking,
-- change detection, and approval workflows

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table (multi-tenant support)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payroll snapshots table
CREATE TABLE payroll_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    upload_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    file_name TEXT,
    row_count INTEGER,
    status TEXT CHECK (status IN ('uploaded', 'processed', 'approved', 'rejected')) DEFAULT 'uploaded',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, snapshot_date)
);

-- Employee data within snapshots
CREATE TABLE snapshot_employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_id UUID NOT NULL REFERENCES payroll_snapshots(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL,
    employee_name TEXT,
    department TEXT,
    gross_pay NUMERIC(10, 2),
    deductions NUMERIC(10, 2),
    net_pay NUMERIC(10, 2),
    hours_worked NUMERIC(8, 2),
    rate NUMERIC(10, 2),
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payroll differences (comparison results)
CREATE TABLE payroll_diffs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    current_snapshot_id UUID NOT NULL REFERENCES payroll_snapshots(id) ON DELETE CASCADE,
    previous_snapshot_id UUID NOT NULL REFERENCES payroll_snapshots(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL,
    change_type TEXT CHECK (change_type IN ('new_employee', 'removed_employee', 'pay_increase', 'pay_decrease', 'hours_change', 'rate_change', 'other')) NOT NULL,
    field_changed TEXT,
    old_value TEXT,
    new_value TEXT,
    difference_amount NUMERIC(10, 2),
    difference_percentage NUMERIC(5, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI judgements on material changes
CREATE TABLE material_judgements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    diff_id UUID NOT NULL REFERENCES payroll_diffs(id) ON DELETE CASCADE,
    is_material BOOLEAN NOT NULL,
    is_blocker BOOLEAN DEFAULT FALSE,
    confidence_score NUMERIC(3, 2),
    reasoning TEXT,
    judgement_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Approval workflow tracking
CREATE TABLE approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    snapshot_id UUID NOT NULL REFERENCES payroll_snapshots(id) ON DELETE CASCADE,
    approved_by UUID, -- References auth.users
    approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    approval_notes TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_snapshots_org_date ON payroll_snapshots(organization_id, snapshot_date);
CREATE INDEX idx_snapshot_employees_snapshot ON snapshot_employees(snapshot_id);
CREATE INDEX idx_snapshot_employees_employee ON snapshot_employees(employee_id);
CREATE INDEX idx_diffs_current_snapshot ON payroll_diffs(current_snapshot_id);
CREATE INDEX idx_diffs_employee ON payroll_diffs(employee_id);
CREATE INDEX idx_judgements_diff ON material_judgements(diff_id);
CREATE INDEX idx_approvals_snapshot ON approvals(snapshot_id);

-- Row Level Security (RLS) - Enable on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshot_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_diffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_judgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies (basic templates - customize based on auth setup)
-- Organizations: Users can only see their own organization
CREATE POLICY "Users can view their organization"
    ON organizations FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Snapshots: Users can only access snapshots from their organization
CREATE POLICY "Users can view organization snapshots"
    ON payroll_snapshots FOR SELECT
    USING (
        organization_id IN (
            SELECT id FROM organizations
            WHERE id = organization_id
        )
    );

-- Similar policies for other tables
CREATE POLICY "Users can view organization snapshot employees"
    ON snapshot_employees FOR SELECT
    USING (
        snapshot_id IN (
            SELECT id FROM payroll_snapshots
            WHERE organization_id IN (
                SELECT id FROM organizations
            )
        )
    );

CREATE POLICY "Users can view organization diffs"
    ON payroll_diffs FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view organization judgements"
    ON material_judgements FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view organization approvals"
    ON approvals FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- View for easy access to latest comparison results
CREATE VIEW latest_payroll_comparisons AS
SELECT
    o.name AS organization_name,
    ps.snapshot_date,
    ps.status,
    COUNT(DISTINCT pd.id) AS total_changes,
    COUNT(DISTINCT mj.id) FILTER (WHERE mj.is_material = true) AS material_changes,
    COUNT(DISTINCT mj.id) FILTER (WHERE mj.is_blocker = true) AS blockers,
    a.approval_status
FROM organizations o
JOIN payroll_snapshots ps ON o.id = ps.organization_id
LEFT JOIN payroll_diffs pd ON ps.id = pd.current_snapshot_id
LEFT JOIN material_judgements mj ON pd.id = mj.diff_id
LEFT JOIN approvals a ON ps.id = a.snapshot_id
GROUP BY o.name, ps.snapshot_date, ps.status, a.approval_status;

COMMENT ON TABLE organizations IS 'Multi-tenant organization records';
COMMENT ON TABLE payroll_snapshots IS 'Uploaded payroll snapshot metadata';
COMMENT ON TABLE snapshot_employees IS 'Individual employee records within snapshots';
COMMENT ON TABLE payroll_diffs IS 'Detected differences between payroll snapshots';
COMMENT ON TABLE material_judgements IS 'AI-generated judgements on change materiality';
COMMENT ON TABLE approvals IS 'Approval workflow tracking';
