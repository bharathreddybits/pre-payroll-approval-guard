# Pre-Payroll Approval Guard MVP - Implementation Plan

**Target**: Launch-ready MVP in <4 weeks
**Philosophy**: Boring, reliable, correct over clever
**Core Value**: Avoid one $50K mistake > save 30 minutes

---

## 1. Project Goals & Success Criteria

### Primary Goal
Enable a payroll director to confidently answer: **"What materially changed since the last approved payroll run?"** in one screen, in under 5 minutes.

### V1 Success Criteria (Measurable)
- **Technical**: Upload 2 CSVs (prev + current) → see review screen with all material changes → approve/reject → audit trail recorded — **all in <10 seconds**
- **Accuracy**: Zero false positives on blockers (negative net pay, >20% decrease)
- **Scale**: Handle 500 employees without performance degradation
- **User Experience**: One-screen UI, no filters/sorting needed for 95% of reviews
- **Cost**: Operational costs <$60/month

### Non-Goals for V1
- ❌ Long-term payroll storage / employee master system
- ❌ Payroll calculation or tax simulation
- ❌ Historical trends or forecasting
- ❌ Integration with payroll systems (Gusto, ADP, etc.)
- ❌ Custom thresholds per organization
- ❌ Mobile app (responsive web is sufficient)

---

## 2. High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER (Payroll Director)                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Upload 2 CSVs
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js on Vercel (Frontend)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Upload Page  │  │ Review Page  │  │  Dashboard   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ API Routes
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Supabase (Database + Auth + Storage)                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Tables: organization, review_session,                    │   │
│  │         payroll_dataset, employee_pay_record,            │   │
│  │         pay_component, payroll_delta,                    │   │
│  │         material_judgement, approval                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ RLS Policies: Multi-tenant data isolation                │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Webhook trigger / Direct call
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│           n8n on Hostinger VPS (Workflow Automation)             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Workflow 1: CSV Ingest → Validate → Store to DB         │   │
│  │ Workflow 2: Fetch Snapshots → Diff Calc → Store Diffs   │   │
│  │ Workflow 3: Apply Rules → Generate Judgements → Store   │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Optional (explanations only)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              OpenAI GPT-4o-mini (Plain Language)                 │
│  • Input: Deterministic judgement result                         │
│  • Output: Human-readable explanation                            │
│  • Cost: ~$0.01-0.03 per review (material changes only)          │
└─────────────────────────────────────────────────────────────────┘

Data Flow:
User uploads CSVs → n8n validates & stores → n8n calculates diff
→ n8n applies deterministic rules → judgements stored in DB
→ Next.js renders review screen → user approves/rejects
→ approval recorded in DB → audit trail complete
```

---

## 3. Data Model (Supabase Tables) - REFINED

**Status**: ⏳ Refined model ready for implementation in `supabase/migrations/002_refined_schema.sql`

**Key Improvements**: Domain-specific payroll metadata (pay periods, run types), scalable Pay_Component table for diverse CSV schemas, component-level delta tracking, persistent change history.

### Core Tables

1. **organization** (Multi-Tenant Foundation)
   - `organization_id` (UUID, PK)
   - `organization_name` (TEXT)
   - `created_at`, `updated_at` (TIMESTAMP)
   - **Purpose**: Multi-tenant support for SaaS customers

2. **review_session** (Core Session Entity)
   - `review_session_id` (UUID, PK)
   - `organization_id` (UUID, FK → organization)
   - `created_at` (TIMESTAMP)
   - `uploaded_by` (UUID - references auth.users)
   - `status` (in_progress | reviewed | completed)
   - **Purpose**: Tracks a single payroll review session (one upload of baseline + current)

3. **payroll_dataset** (Uploaded Datasets with Payroll-Specific Metadata)
   - `dataset_id` (UUID, PK)
   - `review_session_id` (UUID, FK → review_session)
   - `organization_id` (UUID, FK → organization)
   - `dataset_type` (baseline | current)
   - `period_start_date`, `period_end_date`, `pay_date` (DATE)
   - `run_type` (regular | off_cycle)
   - `upload_timestamp` (TIMESTAMP)
   - `row_count` (INTEGER)
   - **Purpose**: Stores metadata for each uploaded dataset with payroll domain context
   - **Key Benefit**: Captures pay periods and run types (not just generic snapshot dates)

4. **employee_pay_record** (Individual Employee Pay Records)
   - `record_id` (UUID, PK)
   - `dataset_id` (UUID, FK → payroll_dataset)
   - `employee_id` (TEXT)
   - `employee_name`, `department` (TEXT)
   - `employment_status` (TEXT)
   - `gross_pay`, `net_pay`, `total_deductions` (NUMERIC 10,2)
   - `metadata` (JSONB - optional fields like hours_worked, rate)
   - **Purpose**: Parsed employee data with flexible metadata for custom fields

5. **pay_component** (Scalable Pay Breakdown)
   - `component_id` (UUID, PK)
   - `record_id` (UUID, FK → employee_pay_record)
   - `component_name` (TEXT - e.g., 'Base Salary', '401k Deduction', 'Federal Tax')
   - `component_type` (earning | deduction | tax)
   - `amount` (NUMERIC 10,2)
   - **Purpose**: Explains how gross pay becomes net pay; handles diverse CSV schemas
   - **Key Benefit**: Scalable to different payroll systems (some have 5 components, others 20+)

6. **payroll_delta** (Derived Delta Records - Persistent)
   - `delta_id` (UUID, PK)
   - `review_session_id` (UUID, FK → review_session)
   - `organization_id` (UUID, FK → organization)
   - `employee_id` (TEXT)
   - `metric` (net_pay | gross_pay | total_deductions | component)
   - `component_name` (TEXT - populated if metric='component')
   - `baseline_value`, `current_value` (NUMERIC 10,2)
   - `delta_absolute`, `delta_percentage` (NUMERIC)
   - `change_type` (increase | decrease | new_employee | removed_employee | no_change)
   - **Purpose**: Stores computed deltas (persistent, not ephemeral) for audit trail and historical analysis
   - **Key Benefit**: Can track component-level changes (e.g., "401k Deduction increased from $500 to $800")

7. **material_judgement** (Deterministic Rule Results)
   - `judgement_id` (UUID, PK)
   - `delta_id` (UUID, FK → payroll_delta)
   - `is_material` (BOOLEAN)
   - `is_blocker` (BOOLEAN)
   - `confidence_score` (NUMERIC 3,2)
   - `reasoning` (TEXT - human-readable explanation)
   - `rule_id` (TEXT - e.g., 'R001_NEGATIVE_NET_PAY', 'R002_NET_PAY_DECREASE_20PCT')
   - **Purpose**: Stores deterministic judgement results with rule traceability

8. **approval** (Audit Trail)
   - `approval_id` (UUID, PK)
   - `review_session_id` (UUID, FK → review_session)
   - `organization_id` (UUID, FK → organization)
   - `approved_by` (UUID - references auth.users)
   - `approval_status` (pending | approved | rejected)
   - `approval_notes` (TEXT)
   - `approved_at`, `created_at` (TIMESTAMP)
   - **Purpose**: Approval audit trail - who approved, when, why (notes required for rejections)

9. **user_organization_mapping** (For RLS Policies)
   - `user_id` (UUID, FK → auth.users)
   - `organization_id` (UUID, FK → organization)
   - `role` (viewer | approver | admin)
   - **Purpose**: Maps Supabase Auth users to organizations with roles for RLS enforcement

### View: `latest_review_sessions`
Pre-aggregated summary for dashboard:
```sql
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
    a.approved_at
FROM review_session rs
JOIN organization o ON rs.organization_id = o.organization_id
LEFT JOIN payroll_delta pd ON rs.review_session_id = pd.review_session_id
LEFT JOIN material_judgement mj ON pd.delta_id = mj.delta_id
LEFT JOIN approval a ON rs.review_session_id = a.review_session_id
GROUP BY rs.review_session_id, o.organization_name, a.approval_status, a.approved_at
ORDER BY rs.created_at DESC;
```

### Indexes (For Performance)
- `idx_review_session_org`: Fast lookups by organization + date
- `idx_payroll_dataset_session`: Dataset joins
- `idx_employee_pay_record_dataset`, `idx_employee_pay_record_employee_id`: Employee record joins
- `idx_pay_component_record`: Component breakdowns
- `idx_payroll_delta_session`, `idx_payroll_delta_employee`: Delta queries
- `idx_material_judgement_delta`, `idx_material_judgement_blocker`: Judgement joins
- `idx_approval_session`, `idx_approval_org_date`: Audit queries

### Security: RLS
- ✅ RLS enabled on all tables
- ✅ `user_organization_mapping` table for multi-tenant access control
- **RLS Policy Pattern**:
  ```sql
  CREATE POLICY "Users access own org data"
      ON [table_name] FOR ALL
      USING (
          organization_id IN (
              SELECT organization_id FROM user_organization_mapping
              WHERE user_id = auth.uid()
          )
      );
  ```

### Full SQL Schema
See appendix or `supabase/migrations/002_refined_schema.sql` for complete CREATE TABLE statements with all constraints, indexes, RLS policies, and triggers.

---

## 4. Core Workflows (Markdown SOPs)

**Status**: 2 workflows exist, 2 need to be created

### Existing Workflows
1. ✅ `workflows/payroll_snapshot_upload.md` - CSV upload, validation, storage
2. ✅ `workflows/payroll_review_ui.md` - One-screen review interface spec

### Workflows to Create
3. **`workflows/payroll_comparison.md`** (High Priority)
   - **Objective**: Calculate deterministic diff between two datasets (baseline vs current)
   - **Inputs**: `review_session_id` (which contains 2 datasets: baseline + current)
   - **Process**: Fetch employee_pay_records from both datasets → match by `employee_id` → compute deltas for net_pay, gross_pay, total_deductions, and pay_components
   - **Outputs**: Rows in `payroll_delta` table
   - **Tools**: n8n workflow OR Python script `tools/diff_calculator.py`

4. **`workflows/material_judgement.md`** (High Priority)
   - **Objective**: Apply deterministic rules to deltas, flag material changes and blockers
   - **Inputs**: Rows from `payroll_delta`
   - **Process**: For each delta, apply 5 core rules (see section 7.2)
   - **Outputs**: Rows in `material_judgement` table with `rule_id` for traceability
   - **Tools**: n8n workflow OR Python script `tools/judgement_engine.py`

---

## 5. UI/UX Plan

### Design Principles
- **Calm**: No alerts, no urgency unless blockers exist
- **Minimal**: One screen, no tabs, no navigation
- **Explicit**: "This is risky" not "High priority"
- **Stateless**: No saved filters, no personalization

### Main Screen: Review Page (`pages/review/[reviewSessionId].tsx`)

**Layout Sections** (top to bottom):

1. **Header**
   - Organization name, snapshot date (e.g., "Dec 15, 2025")
   - Comparison context: "vs. Dec 8, 2025 (last approved)"
   - Status badge: Pending Review | Approved | Rejected

2. **Summary Cards** (4-column grid, collapsible on mobile)
   - Total Changes: 23
   - Material Changes: 5 (yellow)
   - Blockers: 1 (red)
   - Previous Approvals: 12 (green)

3. **Blockers Section** (if any)
   - **Header**: "🚫 Blockers — Must Resolve Before Approval"
   - **Card per blocker**:
     - Employee ID + Name
     - Issue: "Negative Net Pay"
     - Current: -$150.00 | Expected: Positive
     - Reasoning: "Net pay calculation error - deductions ($2,150) exceed gross pay ($2,000)"
     - Suggested Action: "Review deductions or adjust gross pay before processing"
   - **Style**: Red border, red badge, attention-grabbing but not alarming

4. **Material Changes Section**
   - **Header**: "⚠️ Material Changes — Require Review"
   - **Grouped by type**:
     - Pay Decreases (if any - high priority)
     - Pay Increases (>50%)
     - Removed Employees
     - New Employees
     - Hours Changes
   - **Card per change**:
     - Employee ID + Name, Department
     - Old Value → New Value (with % change)
     - Confidence: 95%
     - Reasoning (expandable): "Typical increases are 2-5%. Verify promotion, bonus, or data entry."
   - **Style**: Yellow/orange border, warning badge

5. **Non-Material Changes Section** (collapsed by default)
   - **Summary**: "18 other minor changes detected"
   - **Expand to see**: List of low-confidence changes (hours <10%, rate <5%, etc.)

6. **Approval Actions** (sticky footer)
   - **Primary**: Green "Approve Payroll" button
     - Disabled if blockers exist
     - Opens confirmation modal: "I confirm I've reviewed all material changes"
     - Checkbox required before submit
   - **Secondary**: Red "Reject Payroll" button
     - Opens modal requiring notes (min 10 chars)
   - **Tertiary**: "Export Report" button (PDF/CSV - defer to post-MVP)

### Component Library
Use **shadcn/ui** for:
- `Button` (primary, secondary, destructive variants)
- `Card` (for change cards)
- `Badge` (for status indicators)
- `Dialog` (for confirmation modals)
- `Accordion` (for collapsed sections)
- `AlertDialog` (for approval confirmation)

Custom components in `components/`:
- `BlockerAlert.tsx` - Red card for blockers
- `MaterialChangeCard.tsx` - Yellow card for material changes
- `ChangeSummaryCards.tsx` - Top 4 metric cards
- `ApprovalActions.tsx` - Footer with approve/reject buttons

### Mobile Responsiveness
- Stack cards vertically (no horizontal scroll)
- Collapse summary cards to 2x2 grid
- Touch-friendly buttons (min 44px height)
- Material changes: show 1 column

### Accessibility
- Keyboard nav: Tab through changes, Enter to expand
- Screen readers: ARIA labels on all badges and buttons
- Color-blind friendly: Use icons + text, not just color
- Focus states: Clear outlines on interactive elements

---

## 6. Security & Compliance Notes

### Authentication
- **Supabase Auth**: Email/password for MVP
- **Session management**: HTTP-only cookies via Supabase client
- **Route protection**: Middleware redirects unauthenticated users to `/login`

### Authorization (Row-Level Security)
- ✅ RLS enabled on all tables
- **TODO**: Add `user_organizations` table
  ```sql
  CREATE TABLE user_organizations (
    user_id UUID REFERENCES auth.users(id),
    organization_id UUID REFERENCES organizations(id),
    role TEXT CHECK (role IN ('viewer', 'approver', 'admin')),
    PRIMARY KEY (user_id, organization_id)
  );
  ```
- **RLS Policy Example**:
  ```sql
  CREATE POLICY "Users see own org snapshots"
    ON payroll_snapshots FOR SELECT
    USING (
      organization_id IN (
        SELECT organization_id FROM user_organizations
        WHERE user_id = auth.uid()
      )
    );
  ```

### Data Protection
- **At Rest**: Supabase encrypts DB by default (AES-256)
- **In Transit**: HTTPS enforced via Vercel (auto-certificates)
- **Secrets**: Store in Vercel env vars, never commit to GitHub
- **PII Handling**:
  - Employee names/IDs stored as-is (required for review)
  - Use `data_anonymizer.py` for dev/testing (replace names with "Employee A", "Employee B")
  - No SSN, DOB, or addresses in schema

### Audit Trail
- **Immutable logs**: All approvals tracked in `approvals` table
- **Fields**: `approved_by`, `approved_at`, `approval_notes`, `approval_status`
- **Compliance**: Meets basic audit requirements for payroll changes
- **Retention**: Keep audit logs for 7 years (configurable)

### Secrets Management
- `.env` file (gitignored) for local development
- Vercel environment variables for production
- **Required secrets**:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
  - `OPENAI_API_KEY` (for explanations)
  - `N8N_WEBHOOK_URL`, `N8N_API_KEY` (for workflow triggers)

### Potential Compliance (Post-MVP)
- **SOC 2 Type II**: If targeting enterprise (>1,000 employees)
- **GDPR**: If targeting EU customers (right to deletion, data portability)
- **CCPA**: If targeting California customers

---

## 7. Step-by-Step Implementation Roadmap

### **Phase 0: Environment Setup** (Day 1)
**Goal**: All infrastructure running and connected

**Tasks**:
1. ✅ Create Supabase project
2. ✅ Run migration: `supabase/migrations/001_initial_schema.sql`
3. ✅ Configure `.env` with real credentials
4. ✅ Test Supabase connection from Next.js (simple SELECT)
5. ✅ Install Python dependencies: `pip install -r tools/requirements.txt`
6. ⏳ Set up n8n on Hostinger VPS (Docker recommended)
7. ⏳ Configure n8n credentials (Supabase, OpenAI)

**Validation**:
- Can query `organizations` table from Next.js API route
- Can run Python script that connects to Supabase
- n8n UI accessible at `https://n8n.yourdomain.com`

**Risks**: Hostinger VPS setup may take longer if SSH issues

---

### **Phase 1: Data Pipeline - Backend Logic** (Days 2-5)
**Goal**: CSV upload → DB storage → diff calculation → judgements

#### 1.1 CSV Upload API (Day 2)
**Build**:
- `pages/api/upload.ts` - Accepts 2 CSV files via multipart/form-data
- `tools/validate_csv.py` - Validation logic
  - Required columns: `employee_id`, `gross_pay`, `deductions`, `net_pay`, `hours_worked`, `rate`
  - Validate: `net_pay ≈ gross_pay - deductions` (±$0.01 tolerance)
  - Check: Numeric fields parse correctly, employee_id not empty
  - Flag: `net_pay < 0` as immediate validation error
- Simple test form: `pages/upload-test.tsx` (for development only)

**Process**:
```typescript
// POST /api/upload
// Expects: 2 CSV files (baseline + current) + metadata (organization_id, pay_date, period dates)

1. Parse both CSV files (use Papa Parse or csv-parser)
2. Call validate_csv.py via Python child process for each CSV
3. If validation fails, return 400 with error details

4. Create review_session (status='in_progress')
5. Insert two payroll_dataset records (baseline + current) with period metadata
6. For each dataset, bulk insert into employee_pay_record
7. For each employee record, parse and insert pay_components (if CSV has component breakdown)

8. Return: { review_session_id, baseline_row_count, current_row_count }
```

**Critical Decision**: No Supabase Storage for CSVs. Parse in memory, store only parsed data in DB. Simpler, cheaper, faster.

**Files to Create**:
- `pages/api/upload.ts`
- `tools/validate_csv.py`

#### 1.2 Diff Calculator (Day 3)
**Build**: `tools/diff_calculator.py`

**Algorithm** (deterministic, no ML):
```python
def calculate_diff(review_session_id):
    # Fetch both datasets (baseline and current) for this review session
    datasets = supabase.from_('payroll_dataset') \
        .select('dataset_id, dataset_type') \
        .eq('review_session_id', review_session_id) \
        .execute()

    baseline_id = next(d['dataset_id'] for d in datasets.data if d['dataset_type'] == 'baseline')
    current_id = next(d['dataset_id'] for d in datasets.data if d['dataset_type'] == 'current')

    # Fetch employee pay records from both datasets
    baseline_emps = {e['employee_id']: e for e in get_employee_records(baseline_id)}
    current_emps = {e['employee_id']: e for e in get_employee_records(current_id)}

    deltas = []

    # Detect removed employees
    for emp_id in baseline_emps:
        if emp_id not in current_emps:
            deltas.append({
                'review_session_id': review_session_id,
                'employee_id': emp_id,
                'metric': 'net_pay',  # or could be 'removed_employee'
                'baseline_value': baseline_emps[emp_id]['net_pay'],
                'current_value': 0,
                'change_type': 'removed_employee'
            })

    # Detect new and changed employees
    for emp_id, curr_emp in current_emps.items():
        if emp_id not in baseline_emps:
            deltas.append({
                'review_session_id': review_session_id,
                'employee_id': emp_id,
                'metric': 'net_pay',
                'current_value': curr_emp['net_pay'],
                'change_type': 'new_employee'
            })
        else:
            baseline_emp = baseline_emps[emp_id]

            # Compare net_pay
            if curr_emp['net_pay'] != baseline_emp['net_pay']:
                delta_abs = curr_emp['net_pay'] - baseline_emp['net_pay']
                delta_pct = (delta_abs / baseline_emp['net_pay']) * 100 if baseline_emp['net_pay'] != 0 else 0
                deltas.append({
                    'review_session_id': review_session_id,
                    'employee_id': emp_id,
                    'metric': 'net_pay',
                    'baseline_value': baseline_emp['net_pay'],
                    'current_value': curr_emp['net_pay'],
                    'delta_absolute': delta_abs,
                    'delta_percentage': delta_pct,
                    'change_type': 'increase' if delta_abs > 0 else 'decrease'
                })

            # Similar for gross_pay, total_deductions

            # NEW: Compare pay_components (if available)
            baseline_components = get_pay_components(baseline_emp['record_id'])
            current_components = get_pay_components(curr_emp['record_id'])

            for component_name in set(baseline_components.keys()) | set(current_components.keys()):
                baseline_amt = baseline_components.get(component_name, 0)
                current_amt = current_components.get(component_name, 0)

                if baseline_amt != current_amt:
                    delta_abs = current_amt - baseline_amt
                    delta_pct = (delta_abs / baseline_amt) * 100 if baseline_amt != 0 else 0
                    deltas.append({
                        'review_session_id': review_session_id,
                        'employee_id': emp_id,
                        'metric': 'component',
                        'component_name': component_name,
                        'baseline_value': baseline_amt,
                        'current_value': current_amt,
                        'delta_absolute': delta_abs,
                        'delta_percentage': delta_pct,
                        'change_type': 'increase' if delta_abs > 0 else 'decrease'
                    })

    # Bulk insert into payroll_delta
    insert_deltas(deltas)
```

**API Endpoint**: `pages/api/compare.ts`
- Input: `{ review_session_id }`
- Calls `diff_calculator.py` via Python subprocess
- Returns: `{ delta_count, timestamp }`

**Files to Create**:
- `tools/diff_calculator.py`
- `pages/api/compare.ts`

#### 1.3 Judgement Engine (Days 4-5)
**Build**: `tools/judgement_engine.py`

**5 Core Rules** (deterministic, rule-based):

1. **BLOCKER: Negative Net Pay**
   ```python
   if net_pay < 0:
       return {
           'is_blocker': True,
           'is_material': True,
           'confidence_score': 1.0,
           'reasoning': 'Net pay is negative ($X). This will fail payroll processing and may violate labor laws.'
       }
   ```

2. **BLOCKER: Net Pay Decrease > 20%**
   ```python
   if change_type == 'pay_decrease' and difference_percentage < -20:
       return {
           'is_blocker': True,
           'is_material': True,
           'confidence_score': 0.95,
           'reasoning': f'Net pay decreased by {abs(difference_percentage):.1f}%, exceeding threshold for material change. Verify deductions and gross pay before processing.'
       }
   ```

3. **MATERIAL: Net Pay Increase > 50%**
   ```python
   if change_type == 'pay_increase' and difference_percentage > 50:
       return {
           'is_blocker': False,
           'is_material': True,
           'confidence_score': 0.90,
           'reasoning': f'Net pay increased by {difference_percentage:.1f}%. Typical increases are 2-5%. Verify promotion, bonus, or data entry error.'
       }
   ```

4. **MATERIAL: Removed Employee**
   ```python
   if change_type == 'removed_employee':
       return {
           'is_blocker': False,
           'is_material': True,
           'confidence_score': 0.85,
           'reasoning': f'Employee {employee_id} removed from payroll. Confirm termination was processed correctly and final pay is accurate.'
       }
   ```

5. **MATERIAL: New Employee**
   ```python
   if change_type == 'new_employee':
       # If this is the first snapshot (no previous), mark as non-material
       if is_first_snapshot:
           return {'is_material': False}

       return {
           'is_blocker': False,
           'is_material': True,
           'confidence_score': 0.75,
           'reasoning': f'New employee {employee_id} added to payroll. Verify onboarding paperwork, tax withholdings, and pay rate are correct.'
       }
   ```

**Process**:
```python
def apply_judgements(diff_ids):
    for diff_id in diff_ids:
        diff = get_diff(diff_id)
        judgement = apply_rules(diff)  # Returns dict with is_material, is_blocker, etc.
        insert_judgement(diff_id, judgement)
```

**Integration**:
- Call from `pages/api/compare.ts` after diff calculation
- OR create separate endpoint: `POST /api/judgements` (if n8n needs it)

**Files to Create**:
- `tools/judgement_engine.py`
- Update `pages/api/compare.ts` to call judgement engine

**Defer to Post-MVP**: OpenAI explanations (add in Phase 4 if time permits)

---

### **Phase 2: Review UI - Frontend** (Days 6-9)
**Goal**: Build one-screen review interface with all components

#### 2.1 API Route for Review Data (Day 6)
**Build**: `pages/api/review/[reviewSessionId].ts`

**Query**:
```typescript
// 1. Get review session metadata with organization
const session = await supabase
  .from('review_session')
  .select(`
    *,
    organization (organization_name),
    payroll_dataset (
      dataset_type,
      period_start_date,
      period_end_date,
      pay_date,
      run_type
    )
  `)
  .eq('review_session_id', reviewSessionId)
  .single();

// 2. Get all deltas with judgements
const { data: deltas } = await supabase
  .from('payroll_delta')
  .select(`
    *,
    material_judgement (
      is_material,
      is_blocker,
      confidence_score,
      reasoning,
      rule_id
    )
  `)
  .eq('review_session_id', reviewSessionId)
  .order('material_judgement.is_blocker', { ascending: false });

// 3. Get summary stats (use latest_review_sessions view)
const summary = await supabase
  .from('latest_review_sessions')
  .select('*')
  .eq('review_session_id', reviewSessionId)
  .single();

// 4. Categorize changes
const blockers = deltas.filter(d => d.material_judgement?.is_blocker);
const material = deltas.filter(d => d.material_judgement?.is_material && !d.material_judgement?.is_blocker);
const nonMaterial = deltas.filter(d => !d.material_judgement?.is_material);

// Extract baseline and current dataset info
const baseline = session.payroll_dataset.find(d => d.dataset_type === 'baseline');
const current = session.payroll_dataset.find(d => d.dataset_type === 'current');

return {
  session: {
    review_session_id: session.review_session_id,
    organization_name: session.organization.organization_name,
    status: session.status,
    baseline_period: `${baseline.period_start_date} to ${baseline.period_end_date}`,
    current_period: `${current.period_start_date} to ${current.period_end_date}`,
    pay_date: current.pay_date,
    run_type: current.run_type
  },
  summary: {
    total_changes: summary.total_changes,
    material_changes: summary.material_changes,
    blockers_count: summary.blockers,
    approval_status: summary.approval_status
  },
  blockers,
  material_changes: groupByMetric(material),  // { net_pay: [...], component: [...], etc. }
  non_material_changes: nonMaterial
};
```

**Response Shape**:
```json
{
  "session": {
    "review_session_id": "uuid",
    "organization_name": "Acme Corp",
    "status": "in_progress",
    "baseline_period": "2025-12-01 to 2025-12-15",
    "current_period": "2025-12-16 to 2025-12-31",
    "pay_date": "2026-01-05",
    "run_type": "regular"
  },
  "summary": {
    "total_changes": 23,
    "material_changes": 5,
    "blockers_count": 1,
    "approval_status": "pending"
  },
  "blockers": [
    {
      "employee_id": "1234",
      "metric": "net_pay",
      "baseline_value": "2000.00",
      "current_value": "-150.00",
      "delta_percentage": -107.5,
      "material_judgement": {
        "reasoning": "Net pay is negative...",
        "rule_id": "R001_NEGATIVE_NET_PAY"
      }
    }
  ],
  "material_changes": {
    "net_pay": [...],
    "gross_pay": [...],
    "component": [...]
  },
  "non_material_changes": [...]
}
```

**Files to Create**:
- `pages/api/review/[reviewSessionId].ts`

#### 2.2 Install shadcn/ui (Day 6)
**Setup**:
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card badge dialog accordion alert-dialog
```

**Configure** `components.json`:
```json
{
  "style": "default",
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "styles/globals.css"
  }
}
```

#### 2.3 React Components (Days 7-8)

**Build** (in `components/`):

1. **`BlockerAlert.tsx`**
   ```tsx
   import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
   import { Badge } from '@/components/ui/badge';

   interface BlockerAlertProps {
     blocker: {
       employee_id: string;
       employee_name: string;
       change_type: string;
       old_value: string;
       new_value: string;
       reasoning: string;
     };
   }

   export function BlockerAlert({ blocker }: BlockerAlertProps) {
     return (
       <Alert variant="destructive" className="mb-4">
         <AlertTitle className="flex items-center gap-2">
           🚫 BLOCKER: Employee #{blocker.employee_id} - {blocker.employee_name}
         </AlertTitle>
         <AlertDescription>
           <div className="mt-2 space-y-2">
             <div className="flex justify-between">
               <span className="font-semibold">Issue:</span>
               <span>{formatChangeType(blocker.change_type)}</span>
             </div>
             <div className="flex justify-between">
               <span className="font-semibold">Current:</span>
               <span className="text-red-600 font-bold">{blocker.new_value}</span>
             </div>
             <div className="mt-3 p-3 bg-red-50 rounded">
               <p className="text-sm"><strong>Why this matters:</strong> {blocker.reasoning}</p>
             </div>
           </div>
         </AlertDescription>
       </Alert>
     );
   }
   ```

2. **`MaterialChangeCard.tsx`**
   ```tsx
   import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
   import { Badge } from '@/components/ui/badge';
   import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

   interface MaterialChangeCardProps {
     change: {
       employee_id: string;
       employee_name: string;
       department?: string;
       change_type: string;
       old_value: string;
       new_value: string;
       difference_percentage?: number;
       material_judgements?: {
         confidence_score: number;
         reasoning: string;
       };
     };
   }

   export function MaterialChangeCard({ change }: MaterialChangeCardProps) {
     const confidenceColor = change.material_judgements?.confidence_score >= 0.9 ? 'bg-orange-500' : 'bg-yellow-500';

     return (
       <Card className="mb-3 border-l-4 border-l-yellow-500">
         <CardHeader>
           <CardTitle className="text-lg flex items-center justify-between">
             <span>
               Employee #{change.employee_id} - {change.employee_name}
               {change.department && <span className="text-sm text-gray-500 ml-2">({change.department})</span>}
             </span>
             <Badge className={confidenceColor}>
               {Math.round(change.material_judgements?.confidence_score * 100)}% confidence
             </Badge>
           </CardTitle>
         </CardHeader>
         <CardContent>
           <div className="flex items-center justify-between mb-3">
             <div className="text-gray-600">{change.old_value}</div>
             <div className="text-xl font-bold">→</div>
             <div className="text-lg font-bold text-orange-600">{change.new_value}</div>
             {change.difference_percentage && (
               <Badge variant="outline">
                 {change.difference_percentage > 0 ? '+' : ''}
                 {change.difference_percentage.toFixed(1)}%
               </Badge>
             )}
           </div>

           <Accordion type="single" collapsible>
             <AccordionItem value="reasoning">
               <AccordionTrigger>Why this was flagged</AccordionTrigger>
               <AccordionContent>
                 <p className="text-sm text-gray-700">{change.material_judgements?.reasoning}</p>
               </AccordionContent>
             </AccordionItem>
           </Accordion>
         </CardContent>
       </Card>
     );
   }
   ```

3. **`ChangeSummaryCards.tsx`**
   ```tsx
   import { Card, CardContent } from '@/components/ui/card';

   interface SummaryProps {
     summary: {
       total_changes: number;
       material_changes: number;
       blockers_count: number;
       approval_status: string;
     };
   }

   export function ChangeSummaryCards({ summary }: SummaryProps) {
     return (
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
         <Card>
           <CardContent className="pt-6">
             <div className="text-3xl font-bold text-gray-900">{summary.total_changes}</div>
             <div className="text-sm text-gray-600">Total Changes</div>
           </CardContent>
         </Card>

         <Card className="border-l-4 border-l-yellow-500">
           <CardContent className="pt-6">
             <div className="text-3xl font-bold text-yellow-600">{summary.material_changes}</div>
             <div className="text-sm text-gray-600">Material Changes</div>
           </CardContent>
         </Card>

         <Card className="border-l-4 border-l-red-500">
           <CardContent className="pt-6">
             <div className="text-3xl font-bold text-red-600">{summary.blockers_count}</div>
             <div className="text-sm text-gray-600">Blockers</div>
           </CardContent>
         </Card>

         <Card className="border-l-4 border-l-green-500">
           <CardContent className="pt-6">
             <div className="text-3xl font-bold text-green-600">{summary.approval_status}</div>
             <div className="text-sm text-gray-600">Status</div>
           </CardContent>
         </Card>
       </div>
     );
   }
   ```

4. **`ApprovalActions.tsx`**
   ```tsx
   import { Button } from '@/components/ui/button';
   import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
   import { Textarea } from '@/components/ui/textarea';
   import { useState } from 'react';

   interface ApprovalActionsProps {
     snapshotId: string;
     hasBlockers: boolean;
     onApprove: () => Promise<void>;
     onReject: (notes: string) => Promise<void>;
   }

   export function ApprovalActions({ snapshotId, hasBlockers, onApprove, onReject }: ApprovalActionsProps) {
     const [rejectNotes, setRejectNotes] = useState('');
     const [confirmed, setConfirmed] = useState(false);

     return (
       <div className="sticky bottom-0 bg-white border-t p-4 flex justify-between items-center">
         <div className="text-sm text-gray-600">
           {hasBlockers && '⚠️ Resolve blockers before approving'}
         </div>

         <div className="flex gap-3">
           <AlertDialog>
             <AlertDialogTrigger asChild>
               <Button variant="destructive">Reject Payroll</Button>
             </AlertDialogTrigger>
             <AlertDialogContent>
               <AlertDialogHeader>
                 <AlertDialogTitle>Reject this payroll snapshot?</AlertDialogTitle>
                 <AlertDialogDescription>
                   Please provide notes explaining why this payroll is being rejected.
                 </AlertDialogDescription>
               </AlertDialogHeader>
               <Textarea
                 placeholder="Rejection notes (required, min 10 characters)"
                 value={rejectNotes}
                 onChange={(e) => setRejectNotes(e.target.value)}
                 className="mt-4"
               />
               <AlertDialogFooter>
                 <AlertDialogCancel>Cancel</AlertDialogCancel>
                 <AlertDialogAction
                   disabled={rejectNotes.length < 10}
                   onClick={() => onReject(rejectNotes)}
                 >
                   Confirm Rejection
                 </AlertDialogAction>
               </AlertDialogFooter>
             </AlertDialogContent>
           </AlertDialog>

           <AlertDialog>
             <AlertDialogTrigger asChild>
               <Button disabled={hasBlockers}>Approve Payroll</Button>
             </AlertDialogTrigger>
             <AlertDialogContent>
               <AlertDialogHeader>
                 <AlertDialogTitle>Approve this payroll for processing?</AlertDialogTitle>
                 <AlertDialogDescription>
                   By approving, you confirm that you've reviewed all material changes and are ready to process this payroll.
                 </AlertDialogDescription>
               </AlertDialogHeader>
               <div className="flex items-center gap-2 mt-4">
                 <input
                   type="checkbox"
                   id="confirm"
                   checked={confirmed}
                   onChange={(e) => setConfirmed(e.target.checked)}
                 />
                 <label htmlFor="confirm" className="text-sm">
                   I confirm I've reviewed all material changes
                 </label>
               </div>
               <AlertDialogFooter>
                 <AlertDialogCancel>Cancel</AlertDialogCancel>
                 <AlertDialogAction disabled={!confirmed} onClick={onApprove}>
                   Approve Payroll
                 </AlertDialogAction>
               </AlertDialogFooter>
             </AlertDialogContent>
           </AlertDialog>
         </div>
       </div>
     );
   }
   ```

**Files to Create**:
- `components/BlockerAlert.tsx`
- `components/MaterialChangeCard.tsx`
- `components/ChangeSummaryCards.tsx`
- `components/ApprovalActions.tsx`

#### 2.4 Review Page (Day 9)
**Build**: `pages/review/[reviewSessionId].tsx`

```tsx
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { BlockerAlert } from '@/components/BlockerAlert';
import { MaterialChangeCard } from '@/components/MaterialChangeCard';
import { ChangeSummaryCards } from '@/components/ChangeSummaryCards';
import { ApprovalActions } from '@/components/ApprovalActions';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function ReviewPage() {
  const router = useRouter();
  const { reviewSessionId } = router.query;
  const { data, error, mutate } = useSWR(
    reviewSessionId ? `/api/review/${reviewSessionId}` : null,
    fetcher
  );

  const handleApprove = async () => {
    await fetch('/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        review_session_id: reviewSessionId,
        approval_status: 'approved'
      })
    });
    mutate();  // Refresh data
    router.push('/dashboard');
  };

  const handleReject = async (notes: string) => {
    await fetch('/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        review_session_id: reviewSessionId,
        approval_status: 'rejected',
        approval_notes: notes
      })
    });
    mutate();
    router.push('/dashboard');
  };

  if (error) return <div>Error loading review data</div>;
  if (!data) return <div>Loading...</div>;

  const hasBlockers = data.blockers.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Payroll Review: {data.snapshot.organization_name}
          </h1>
          <p className="text-gray-600">
            Snapshot Date: {data.snapshot.snapshot_date}
          </p>
        </div>

        {/* Summary Cards */}
        <ChangeSummaryCards summary={data.summary} />

        {/* Blockers Section */}
        {hasBlockers && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              🚫 Blockers — Must Resolve Before Approval
            </h2>
            {data.blockers.map((blocker: any) => (
              <BlockerAlert key={blocker.id} blocker={blocker} />
            ))}
          </section>
        )}

        {/* Material Changes Section */}
        {data.summary.material_changes > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-yellow-600 mb-4">
              ⚠️ Material Changes — Require Review
            </h2>
            {Object.entries(data.material_changes).map(([type, changes]: [string, any]) => (
              changes.length > 0 && (
                <div key={type} className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    {formatChangeType(type)} ({changes.length})
                  </h3>
                  {changes.map((change: any) => (
                    <MaterialChangeCard key={change.id} change={change} />
                  ))}
                </div>
              )
            ))}
          </section>
        )}

        {/* Non-Material Changes (Collapsed) */}
        {data.non_material_changes.length > 0 && (
          <section className="mb-8">
            <Accordion type="single" collapsible>
              <AccordionItem value="non-material">
                <AccordionTrigger className="text-lg font-semibold">
                  {data.non_material_changes.length} other minor changes detected
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {data.non_material_changes.map((change: any) => (
                      <div key={change.id} className="p-3 bg-gray-100 rounded text-sm">
                        Employee #{change.employee_id}: {change.field_changed} changed from {change.old_value} to {change.new_value}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>
        )}

        {/* Approval Actions */}
        <ApprovalActions
          snapshotId={snapshotId as string}
          hasBlockers={hasBlockers}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </div>
    </div>
  );
}

function formatChangeType(type: string): string {
  return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}
```

**Files to Create**:
- `pages/review/[snapshotId].tsx`

---

### **Phase 3: Approval Workflow** (Days 10-11)
**Goal**: Allow users to approve/reject, track in DB

#### 3.1 Approval API Endpoint (Day 10)
**Build**: `pages/api/approvals.ts`

```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { snapshot_id, approval_status, approval_notes } = req.body;

  // Validation
  if (!snapshot_id || !approval_status) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (approval_status === 'approved') {
    // Check for unresolved blockers
    const { data: blockers, error: blockerError } = await supabase
      .from('payroll_diffs')
      .select('id, material_judgements!inner(is_blocker)')
      .eq('current_snapshot_id', snapshot_id)
      .eq('material_judgements.is_blocker', true);

    if (blockerError) {
      return res.status(500).json({ error: 'Failed to check blockers' });
    }

    if (blockers && blockers.length > 0) {
      return res.status(400).json({
        error: 'Cannot approve with unresolved blockers',
        blockers_count: blockers.length
      });
    }
  }

  // Get organization_id from snapshot
  const { data: snapshot } = await supabase
    .from('payroll_snapshots')
    .select('organization_id')
    .eq('id', snapshot_id)
    .single();

  if (!snapshot) {
    return res.status(404).json({ error: 'Snapshot not found' });
  }

  // Insert approval record
  const { data: approval, error: approvalError } = await supabase
    .from('approvals')
    .insert({
      organization_id: snapshot.organization_id,
      snapshot_id,
      approved_by: null,  // TODO: Get from session after auth implementation
      approval_status,
      approval_notes,
      approved_at: new Date().toISOString()
    })
    .select()
    .single();

  if (approvalError) {
    return res.status(500).json({ error: 'Failed to record approval' });
  }

  // Update snapshot status
  await supabase
    .from('payroll_snapshots')
    .update({ status: approval_status })
    .eq('id', snapshot_id);

  return res.status(200).json({
    success: true,
    approval_id: approval.id,
    approval_status
  });
}
```

**Files to Create**:
- `pages/api/approvals.ts`

#### 3.2 Testing Approval Flow (Day 11)
**Manual Tests**:
1. Upload 2 CSVs with blockers → Try to approve → Should fail with error
2. Upload 2 CSVs with no blockers → Approve → Should succeed, update DB
3. Upload 2 CSVs → Reject with notes → Should succeed, store notes
4. Check audit trail in `approvals` table

**Add Error Handling**:
- Network failures: Show toast notification with retry button
- Concurrent approvals: Poll for status changes every 30s
- Session timeouts: Redirect to login

---

### **Phase 4: n8n Workflows** (Days 12-14)
**Goal**: Migrate Python scripts to n8n for better orchestration

#### 4.1 n8n Workflow 1: CSV Ingest (Day 12)
**Create**: `payroll_upload_pipeline.json` (export from n8n)

**Workflow Steps**:
1. **Webhook Node**: Trigger via POST from `/api/upload`
   - Input: 2 CSV file URLs (uploaded to temp storage) + organization_id
2. **HTTP Request Node**: Download CSVs
3. **Code Node**: Validate CSV (Python or JavaScript)
   - Same logic as `validate_csv.py`
4. **Supabase Node**: Insert into `payroll_snapshots`
5. **Supabase Node**: Bulk insert into `snapshot_employees`
6. **HTTP Request Node**: Webhook back to Next.js with snapshot_id

**Benefit**: Visual workflow, better error handling, retries

**Files to Create**:
- `n8n_workflows/payroll_upload_pipeline.json`
- Update `pages/api/upload.ts` to call n8n webhook

#### 4.2 n8n Workflow 2: Diff + Judgement (Day 13)
**Create**: `payroll_comparison_workflow.json`

**Workflow Steps**:
1. **Webhook Node**: Trigger via POST from `/api/compare`
   - Input: `previous_snapshot_id`, `current_snapshot_id`
2. **Supabase Node**: Fetch previous employees
3. **Supabase Node**: Fetch current employees
4. **Code Node**: Calculate diff (same logic as `diff_calculator.py`)
5. **Supabase Node**: Bulk insert diffs into `payroll_diffs`
6. **Loop Node**: For each diff, apply judgement rules
   - **Code Node**: Apply 5 core rules (same logic as `judgement_engine.py`)
   - **Supabase Node**: Insert into `material_judgements`
7. **HTTP Request Node**: Webhook back with completion status

**Files to Create**:
- `n8n_workflows/payroll_comparison_workflow.json`
- Update `pages/api/compare.ts` to call n8n webhook

#### 4.3 Export n8n Workflows (Day 14)
**Export**:
- Download JSON from n8n UI
- Save to `n8n_workflows/`
- Commit to GitHub

**Documentation**:
- Add to `workflows/README.md`: How to import n8n workflows
- Include webhook URLs in `.env.example`

---

### **Phase 5: Auth + Upload UI** (Days 15-17)
**Goal**: Add Supabase Auth, build upload page, protect routes

#### 5.1 Supabase Auth Setup (Day 15)
**Enable** in Supabase dashboard:
- Email/password authentication
- No email verification for MVP (enable in production)

**Add Auth Helper**:
```typescript
// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

**Login Page**: `pages/login.tsx`
```tsx
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) {
      alert(error.message);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full p-8 bg-white shadow-lg rounded-lg">
        <h1 className="text-2xl font-bold mb-6">Pre-Payroll Approval Guard</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" className="w-full">Login</Button>
        </form>
      </div>
    </div>
  );
}
```

**Middleware**: Protect routes in `middleware.ts`
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session && req.nextUrl.pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/dashboard', '/review/:path*', '/upload']
};
```

**Files to Create**:
- `lib/supabaseClient.ts`
- `pages/login.tsx`
- `middleware.ts`

#### 5.2 Upload Page UI (Day 16)
**Build**: `pages/upload.tsx`

```tsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function UploadPage() {
  const [previousFile, setPreviousFile] = useState<File | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUpload = async () => {
    if (!previousFile || !currentFile) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('previous', previousFile);
    formData.append('current', currentFile);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    if (res.ok) {
      // Trigger comparison
      await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          previous_snapshot_id: data.previous_snapshot_id,
          current_snapshot_id: data.current_snapshot_id
        })
      });

      // Redirect to review
      router.push(`/review/${data.current_snapshot_id}`);
    } else {
      alert('Upload failed: ' + data.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Upload Payroll Snapshots</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Previous Approved Payroll</CardTitle>
          </CardHeader>
          <CardContent>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setPreviousFile(e.target.files?.[0] || null)}
              className="w-full"
            />
            {previousFile && (
              <p className="mt-2 text-sm text-green-600">✓ {previousFile.name}</p>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Current Payroll Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCurrentFile(e.target.files?.[0] || null)}
              className="w-full"
            />
            {currentFile && (
              <p className="mt-2 text-sm text-green-600">✓ {currentFile.name}</p>
            )}
          </CardContent>
        </Card>

        <Button
          onClick={handleUpload}
          disabled={!previousFile || !currentFile || loading}
          className="w-full"
        >
          {loading ? 'Processing...' : 'Upload and Compare'}
        </Button>
      </div>
    </div>
  );
}
```

**Files to Create**:
- `pages/upload.tsx`
- Update `pages/api/upload.ts` to handle FormData

#### 5.3 Dashboard Page (Day 17)
**Build**: `pages/dashboard.tsx`

```tsx
import useSWR from 'swr';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function Dashboard() {
  const { data, error } = useSWR('/api/snapshots', fetcher);

  if (error) return <div>Error loading snapshots</div>;
  if (!data) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Payroll Snapshots</h1>
          <Link href="/upload">
            <Button>Upload New Snapshot</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {data.snapshots.map((snapshot: any) => (
            <Card key={snapshot.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{snapshot.snapshot_date}</span>
                  <Badge variant={getBadgeVariant(snapshot.status)}>
                    {snapshot.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    {snapshot.row_count} employees
                  </div>
                  {snapshot.status === 'processed' && (
                    <Link href={`/review/${snapshot.id}`}>
                      <Button variant="outline">Review</Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function getBadgeVariant(status: string) {
  switch (status) {
    case 'approved': return 'default';
    case 'rejected': return 'destructive';
    case 'processed': return 'secondary';
    default: return 'outline';
  }
}
```

**API Route**: `pages/api/snapshots.ts`
```typescript
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { data, error } = await supabase
    .from('payroll_snapshots')
    .select('*')
    .order('snapshot_date', { ascending: false })
    .limit(20);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ snapshots: data });
}
```

**Files to Create**:
- `pages/dashboard.tsx`
- `pages/api/snapshots.ts`

---

### **Phase 6: Testing + Deploy** (Days 18-20)
**Goal**: Verify end-to-end flow, deploy to production

#### 6.1 End-to-End Testing (Day 18)
**Test Scenarios**:
1. **Happy Path**: Upload 2 CSVs with 2 material changes, 0 blockers → Review → Approve → Check DB
2. **Blocker Scenario**: Upload CSV with negative net pay → Review → See blocker → Cannot approve
3. **Material Change**: Upload CSV with 60% pay increase → Review → See material flag with reasoning
4. **No Changes**: Upload identical CSVs → Review → "No material changes" message
5. **First Upload**: Upload 1 CSV (no previous) → Should show warning
6. **Validation Error**: Upload invalid CSV (missing columns) → Should fail with error

**Create Test Data** (in `.tmp/` directory):
- `baseline.csv`: 10 employees, normal salaries
- `minor_changes.csv`: Same 10 employees, hours ±5%
- `major_changes.csv`: 2 employees with 60% pay increase, 1 with 25% decrease
- `blocker.csv`: 1 employee with negative net pay

**Files to Create**:
- `.tmp/baseline.csv`
- `.tmp/minor_changes.csv`
- `.tmp/major_changes.csv`
- `.tmp/blocker.csv`

#### 6.2 Performance Testing (Day 19)
**Tests**:
- Upload CSV with 500 employees → Should complete in <10s
- Review page with 50 changes → Should load in <2s
- Concurrent uploads (2 users) → Should not interfere

**Optimize if needed**:
- Add pagination for >100 changes
- Lazy load non-material changes
- Use Supabase connection pooling

#### 6.3 Deployment (Day 20)

**Supabase Production Setup**:
1. Create production project in Supabase
2. Run migration: `supabase/migrations/001_initial_schema.sql`
3. Configure RLS policies (customize for multi-tenant)
4. Create test organization + user

**GitHub Setup**:
```bash
git init
git add .
git commit -m "Initial commit: Pre-Payroll Approval Guard MVP"
git remote add origin <your-github-repo>
git push -u origin main
```

**Vercel Deployment**:
1. Import GitHub repo in Vercel dashboard
2. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY` (if using)
   - `N8N_WEBHOOK_URL`, `N8N_API_KEY`
3. Deploy
4. Test production URL

**n8n Production**:
- Ensure n8n is running on Hostinger VPS
- Update webhook URLs in n8n workflows to point to Vercel production URL
- Test webhooks from production

**Files to Update**:
- `.gitignore`: Add `.env`, `.tmp/`, `node_modules/`
- `README.md`: Add deployment instructions

---

### **Phase 7: OpenAI Enhancements (Optional, Days 21-22)**
**Goal**: Add plain-language explanations for material changes

**Defer to Post-MVP if time is tight.**

#### 7.1 OpenAI Explanation Generator
**Build**: `tools/explanation_generator.py`

```python
import openai

openai.api_key = os.getenv('OPENAI_API_KEY')

def generate_explanation(diff, employee_name):
    prompt = f"""You are a payroll expert. Explain this change for a payroll director:

Employee: {employee_name}
Change: {diff['field_changed']}
Old Value: ${diff['old_value']}
New Value: ${diff['new_value']}
Percentage Change: {diff['difference_percentage']}%

Provide:
1. One-sentence summary
2. Potential causes (2-3 bullet points)
3. Recommended action

Keep it concise and actionable."""

    response = openai.ChatCompletion.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=200
    )

    return response.choices[0].message.content
```

**Integration**: Call after applying deterministic rules, store in `material_judgements.reasoning`

**Cost Control**:
- Only call for `is_material=true` changes (not all diffs)
- Max 50 calls per comparison
- Estimated cost: $0.01-0.03 per review (500 employees)

**Files to Create**:
- `tools/explanation_generator.py`
- Add to n8n workflow OR call from API route

---

## 8. Open Questions & Assumptions

### Questions for You

1. **Organization Setup**: How will organizations be created initially?
   - Option A: Manual setup via SQL (for MVP)
   - Option B: Admin UI for creating orgs (post-MVP)
   - **Recommendation**: A for MVP

2. **User-Org Mapping**: How should multi-tenant access work?
   - Assumption: One user = one organization for MVP
   - Post-MVP: Add `user_organizations` join table for multi-org users

3. **CSV Schema**: Do you have sample CSVs with real structure?
   - Required columns: `employee_id`, `gross_pay`, `deductions`, `net_pay`, `hours_worked`, `rate`
   - Optional columns: `employee_name`, `department`
   - **Action**: Share sample CSV if structure is different

4. **n8n Hosting**: Is Hostinger VPS already set up?
   - If not, we can use Python scripts for Phase 1-3, migrate to n8n in Phase 4
   - **Alternative**: Use n8n.cloud (managed, $20/month) to save setup time

5. **Judgement Thresholds**: Confirm these defaults:
   - Blocker: Net pay decrease >20%
   - Material: Net pay increase >50%
   - Material: New/removed employees
   - **Action**: Adjust if your domain knowledge suggests different values

### Assumptions Made

1. **Stateless Model**: User uploads 2 CSVs each time (no automatic comparison)
   - **Reasoning**: Simpler MVP, no cron jobs, no S3 storage
   - **Post-MVP**: Add automatic comparison if previous snapshot exists

2. **Multi-Tenant Ready**: Full multi-tenant support in refined schema
   - RLS policies enforced via `user_organization_mapping` table
   - For MVP testing: Can use single org, expand to multi-tenant easily

3. **No Real-Time Notifications**: User must manually check dashboard
   - **Post-MVP**: Email/Slack notifications on upload completion

4. **Desktop-First UI**: Responsive but optimized for laptop/desktop
   - Payroll directors typically review on larger screens
   - Mobile works but not primary focus

5. **English Only**: No i18n for MVP
   - All copy in English
   - **Post-MVP**: Add i18n if targeting non-English markets

6. **No Integrations**: Manual CSV upload only
   - **Post-MVP**: Gusto/ADP API integrations

7. **Fixed Rules**: No custom thresholds per organization
   - All orgs use same judgement rules (20%, 50%, etc.)
   - **Post-MVP**: Allow org-specific configuration

---

## 9. Next Immediate Actions

### After Plan Approval, Start With:

1. **Day 1 Morning**: Environment setup
   ```bash
   cd "c:\Users\bhara\OneDrive\Desktop\PPG"
   npm install
   pip install -r tools/requirements.txt
   # Create Supabase project
   # Run migration: supabase/migrations/002_refined_schema.sql (see Appendix)
   # Configure .env with real credentials
   ```

2. **Day 1 Afternoon**: Test Supabase connection
   - Create `pages/api/test.ts` to query `organization` table
   - Verify RLS policies allow authenticated access
   - Create test organization via SQL

3. **Day 2 Morning**: Build CSV upload API
   - Implement `pages/api/upload.ts`
   - Implement `tools/validate_csv.py`
   - Test with sample CSV

4. **Day 2 Afternoon**: Build diff calculator
   - Implement `tools/diff_calculator.py`
   - Test with 2 sample CSVs (10 employees each, 3 changes)
   - Verify diffs stored in DB

5. **Day 3**: Build judgement engine
   - Implement `tools/judgement_engine.py` with 5 core rules
   - Test with diffs from Day 2
   - Verify judgements stored in DB

**Then follow Phases 2-7 in order.**

### Files to Create First (Critical Path)

**Backend (Days 2-5)**:
1. `supabase/migrations/002_refined_schema.sql` (see Appendix)
2. `pages/api/upload.ts` (creates review_session + payroll_datasets)
3. `pages/api/compare.ts` (triggers diff calculation)
4. `pages/api/review/[reviewSessionId].ts` (fetches deltas + judgements)
5. `pages/api/approvals.ts` (records approval/rejection)
6. `tools/validate_csv.py`
7. `tools/diff_calculator.py` (computes payroll_delta records)
8. `tools/judgement_engine.py` (applies rules to deltas)

**Frontend (Days 6-9)**:
9. `components/BlockerAlert.tsx`
10. `components/MaterialChangeCard.tsx`
11. `components/ChangeSummaryCards.tsx`
12. `components/ApprovalActions.tsx`
13. `pages/review/[reviewSessionId].tsx` (main review screen)

**Auth + UI (Days 15-17)**:
14. `lib/supabaseClient.ts`
15. `pages/login.tsx`
16. `middleware.ts`
17. `pages/upload.tsx`
18. `pages/dashboard.tsx`

### Success Milestone (End of Week 2)

**Demo Flow**:
1. Login at `/login`
2. Upload 2 CSVs (baseline + current) at `/upload` with pay period metadata
3. Redirected to `/review/{reviewSessionId}` showing:
   - Pay period context (e.g., "Dec 1-15 vs Nov 16-30")
   - Summary cards (total changes, material, blockers)
   - 1 blocker flagged (if test data has negative net pay)
   - 3 material changes with reasoning and rule_id
   - Approve button disabled (due to blocker)
4. Reject payroll with notes
5. Check dashboard at `/dashboard` to see rejected review session
6. Check `approval` table in Supabase to verify audit trail

**Success Criteria**:
- End-to-end flow works without errors
- All 5 judgement rules firing correctly (with correct rule_id)
- Pay periods and run type displayed correctly
- UI is clean, readable, and responsive
- Audit trail captured in DB with approval_notes
- Total time from upload to review: <10 seconds

---

## Appendix: File Structure

```
c:\Users\bhara\OneDrive\Desktop\PPG\
├── .env                          # Environment variables (gitignored)
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
├── README.md
├── CLAUDE.md                     # Agent instructions (WAT framework)
│
├── pages/
│   ├── _app.tsx                  # ✅ Exists
│   ├── index.tsx                 # ✅ Exists (landing page)
│   ├── login.tsx                 # ⏳ To create (Day 15)
│   ├── dashboard.tsx             # ⏳ To create (Day 17)
│   ├── upload.tsx                # ⏳ To create (Day 16)
│   ├── review/
│   │   └── [reviewSessionId].tsx # ⏳ To create (Day 9)
│   └── api/
│       ├── upload.ts             # ⏳ To create (Day 2)
│       ├── compare.ts            # ⏳ To create (Day 3)
│       ├── approvals.ts          # ⏳ To create (Day 10)
│       ├── sessions.ts           # ⏳ To create (Day 17) - list review sessions
│       └── review/
│           └── [reviewSessionId].ts # ⏳ To create (Day 6)
│
├── components/
│   ├── ui/                       # shadcn/ui components (Day 6)
│   ├── BlockerAlert.tsx          # ⏳ To create (Day 7)
│   ├── MaterialChangeCard.tsx    # ⏳ To create (Day 7)
│   ├── ChangeSummaryCards.tsx    # ⏳ To create (Day 8)
│   └── ApprovalActions.tsx       # ⏳ To create (Day 8)
│
├── lib/
│   └── supabaseClient.ts         # ⏳ To create (Day 15)
│
├── styles/
│   └── globals.css               # ✅ Exists (Tailwind + custom styles)
│
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql    # ✅ Exists (original - to be replaced)
│       └── 002_refined_schema.sql    # ⏳ To create (Day 1) - see Appendix
│
├── workflows/
│   ├── README.md                 # ✅ Exists
│   ├── payroll_snapshot_upload.md # ✅ Exists
│   ├── payroll_review_ui.md       # ✅ Exists
│   ├── payroll_comparison.md      # ⏳ To create (Phase 1.2)
│   └── material_judgement.md      # ⏳ To create (Phase 1.3)
│
├── tools/
│   ├── README.md                 # ✅ Exists
│   ├── requirements.txt          # ✅ Exists
│   ├── validate_csv.py           # ⏳ To create (Day 2)
│   ├── diff_calculator.py        # ⏳ To create (Day 3)
│   ├── judgement_engine.py       # ⏳ To create (Day 4-5)
│   └── explanation_generator.py  # ⏳ Optional (Day 21)
│
├── n8n_workflows/
│   ├── payroll_upload_pipeline.json    # ⏳ To create (Day 12)
│   └── payroll_comparison_workflow.json # ⏳ To create (Day 13)
│
└── .tmp/                         # Test data (gitignored)
    ├── baseline.csv              # ⏳ To create (Day 18)
    ├── minor_changes.csv
    ├── major_changes.csv
    └── blocker.csv
```

---

## Verification & Testing Plan

### Unit Testing (As You Build)
For each Python script, create basic tests:
```bash
# tools/test_validate_csv.py
pytest tools/test_validate_csv.py

# tools/test_diff_calculator.py
pytest tools/test_diff_calculator.py
```

### Integration Testing (End of Each Phase)
- **Phase 1**: Upload CSV → Verify data in `snapshot_employees` → Run diff → Verify diffs in `payroll_diffs` → Apply rules → Verify judgements in `material_judgements`
- **Phase 2**: Call `/api/review/{snapshotId}` → Verify JSON response matches expected shape → Load review page → Verify all components render
- **Phase 3**: Approve payroll → Verify `approvals` table updated → Verify snapshot status changed to 'approved'

### End-to-End Testing (Day 18)
Use test CSVs (in `.tmp/`) to simulate real user flows:
1. Happy path (no blockers)
2. Blocker scenario (negative net pay)
3. Material changes only
4. No changes detected
5. First snapshot (no previous)

### Manual QA Checklist
- [ ] Upload 2 valid CSVs → Review page loads in <5s
- [ ] Material changes displayed with reasoning
- [ ] Blockers prevent approval (button disabled)
- [ ] Approve flow: Confirmation modal → Success → Dashboard updated
- [ ] Reject flow: Notes required → Success → Dashboard updated
- [ ] Mobile responsive: Review page readable on tablet
- [ ] Accessibility: Tab through UI, screen reader announces status
- [ ] Error handling: Upload invalid CSV → See error message
- [ ] Concurrent uploads: 2 users upload at same time → No interference

### Production Smoke Test (Day 20)
After Vercel deployment:
1. Visit production URL
2. Login with test user
3. Upload test CSVs
4. Review changes
5. Approve payroll
6. Check Supabase production DB for records
7. Test from mobile device

---

## Cost Estimate (Monthly)

### MVP Operating Costs
- **Supabase**: Free tier (500MB DB, 2GB bandwidth) → $0
- **Vercel**: Free tier (100GB bandwidth, 100 builds/month) → $0
- **Hostinger VPS**: Lowest plan (1GB RAM, 1 CPU) → $4-10/month
- **OpenAI**: ~500 reviews/month × $0.02 per review → $10/month (if using explanations)
- **Domain** (optional): $12/year → $1/month

**Total: $15-21/month for MVP**

### Post-MVP (Production Scale)
- Supabase Pro (if >500MB): $25/month
- Vercel Pro (if >100GB bandwidth): $20/month
- Hostinger VPS (upgrade for n8n): $10-20/month
- OpenAI: $15/month (with caching)

**Total: $70-80/month at scale (1,000+ employees, 50+ orgs)**

---

## Risk Mitigation Summary

| Risk | Impact | Mitigation |
|------|--------|------------|
| CSV parsing edge cases | High | Strict schema validation, reject non-conforming uploads |
| Diff algorithm bugs | High | Unit tests with known input/output, test with real payroll data |
| Supabase query performance | Medium | Schema has proper indexes, test with 1,000+ employees early |
| RLS policies too restrictive | Medium | Start permissive, tighten for multi-tenant launch |
| OpenAI cost overruns | Low | Use GPT-4o-mini only, set max_tokens=200, cache explanations |
| User uploads wrong CSVs | Medium | Show preview before processing, add confirmation step |
| n8n hosting complexity | Medium | Use Python scripts for MVP, migrate to n8n in Phase 4 |
| Time overrun (>4 weeks) | Medium | Defer OpenAI explanations, n8n migration, and post-MVP features |

---

## Launch Readiness Checklist

- [ ] All 5 core judgement rules working correctly
- [ ] End-to-end flow tested (upload → review → approve)
- [ ] No false positives on blockers
- [ ] UI responsive on desktop and tablet
- [ ] Error handling for common failures (network, validation)
- [ ] Audit trail captured in `approvals` table
- [ ] RLS policies enabled (basic multi-tenant support)
- [ ] Secrets stored in Vercel env vars (not in code)
- [ ] GitHub repo up to date
- [ ] Production deployment successful on Vercel
- [ ] Test user can login and complete full flow
- [ ] Documentation updated (README, CLAUDE.md)

---

## APPENDIX: Complete Refined SQL Schema

**File**: `supabase/migrations/002_refined_schema.sql`

```sql
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

COMMENT ON VIEW latest_review_sessions IS 'Dashboard summary with change counts and approval status';

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organization_updated_at
    BEFORE UPDATE ON organization
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

**END OF PLAN**

This plan is designed to get you to a working MVP in <4 weeks while maintaining the correctness and reliability required for payroll systems. Focus on the critical path (Phases 0-3) first, then add auth and UI polish (Phases 4-5), and finally optimize with n8n and OpenAI enhancements if time permits.

The architecture is boring, deterministic, and battle-tested. The UI is minimal and focused. The rules are explicit and debuggable. This is exactly what a payroll director needs: **confidence before clicking "Approve Payroll"**.

**Next Step**: Review this plan, ask clarifying questions if needed, then reply with **APPROVED** to begin implementation.
