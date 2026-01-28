# Judgements in Pre-Payroll Approval Guard

## What are Judgements?

**Judgements** are the results of applying deterministic rules to payroll changes (deltas). Each judgement classifies a change as:
- **Material** or **Non-material** (requires review or not)
- **Blocker** or **Non-blocker** (prevents approval or not)

Judgements provide human-readable reasoning for why a change matters, helping reviewers make informed approval decisions.

## Judgement Workflow

### Current Implementation (Python-Based)

```
┌─────────────┐
│ 1. Upload   │  User uploads baseline + current CSVs
│   CSVs      │  via /upload page or API
└──────┬──────┘
       │
       v
┌─────────────┐
│ 2. Store    │  API validates and stores data in Supabase:
│   Data      │  - payroll_dataset (baseline + current)
└──────┬──────┘  - employee_pay_record (all employee rows)
       │
       v
┌─────────────┐
│ 3. Calculate│  Manual execution:
│   Deltas    │  $ python tools/diff_calculator.py <review_session_id>
└──────┬──────┘
       │          Creates payroll_delta records for each change
       v
┌─────────────┐
│ 4. Apply    │  Manual execution:
│  Judgements │  $ python tools/judgement_engine.py <review_session_id>
└──────┬──────┘
       │          Applies 12 deterministic rules (R001-R099)
       v          Stores material_judgement records
┌─────────────┐
│ 5. Review   │  User views /review/<review_session_id> page
│   Changes   │  Shows all material changes grouped by metric
└──────┬──────┘  Highlights blockers in red
       │
       v
┌─────────────┐
│ 6. Approve  │  User clicks Approve/Reject
│  or Reject  │  API checks for blockers, creates approval record
└─────────────┘  Updates review_session status
```

### Future Implementation (n8n-Based)

```
┌─────────────┐
│ 1. Upload   │  User uploads CSVs
│   CSVs      │
└──────┬──────┘
       │
       v
┌─────────────┐
│ 2. n8n      │  Automatic workflow:
│  Workflow   │  - Validates CSVs
│  Triggers   │  - Stores datasets
└──────┬──────┘  - Calculates deltas
       │          - Applies judgements
       v          - Notifies user
┌─────────────┐
│ 3. Review   │  User reviews auto-processed changes
│   UI        │
└─────────────┘
```

**Status:** n8n integration is a post-MVP enhancement, not yet implemented.

## Where Judgements are Stored

### Database Table: `material_judgement`

Location: Supabase PostgreSQL
Schema: [supabase/migrations/002_refined_schema.sql](../supabase/migrations/002_refined_schema.sql)

**Table Structure:**
```sql
CREATE TABLE IF NOT EXISTS material_judgement (
    judgement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delta_id UUID NOT NULL REFERENCES payroll_delta(delta_id) ON DELETE CASCADE,
    is_material BOOLEAN NOT NULL DEFAULT true,
    is_blocker BOOLEAN NOT NULL DEFAULT false,
    confidence_score DECIMAL(3,2) DEFAULT 0.75,
    reasoning TEXT,
    rule_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Fields Explained:**
- `judgement_id`: Unique identifier for the judgement
- `delta_id`: Links to the specific change (foreign key to payroll_delta)
- `is_material`: True if change requires review, false if minor
- `is_blocker`: True if change prevents approval, false if just informational
- `confidence_score`: 0.0-1.0 indicating rule confidence (e.g., 0.95 = 95%)
- `reasoning`: Human-readable explanation (shown to user)
- `rule_id`: Which rule triggered (e.g., "R001_NEGATIVE_NET_PAY")
- `created_at`: Timestamp of judgement creation

### Example Judgement Records

#### Blocker Example
```json
{
  "judgement_id": "a1b2c3d4-e5f6-4a5b-6c7d-8e9f0a1b2c3d",
  "delta_id": "d4e5f6a7-b8c9-4d5e-6f7a-8b9c0d1e2f3a",
  "is_material": true,
  "is_blocker": true,
  "confidence_score": 1.0,
  "reasoning": "Net pay is negative ($-250.00). This will fail payroll processing and may violate labor laws. Immediate correction required before approval.",
  "rule_id": "R001_NEGATIVE_NET_PAY",
  "created_at": "2026-01-28T10:30:00Z"
}
```

#### Material (Non-Blocker) Example
```json
{
  "judgement_id": "b2c3d4e5-f6a7-4b5c-6d7e-8f9a0b1c2d3e",
  "delta_id": "e5f6a7b8-c9d0-4e5f-6a7b-8c9d0e1f2a3b",
  "is_material": true,
  "is_blocker": false,
  "confidence_score": 0.75,
  "reasoning": "New employee E004 added to payroll with net pay of $4,160.00. Verify onboarding paperwork, tax withholdings, and pay rate are correct.",
  "rule_id": "R005_NEW_EMPLOYEE",
  "created_at": "2026-01-28T10:30:01Z"
}
```

## How to Review Judgements

### 1. Via Web UI (Recommended)

**Review Page:** `/review/[reviewSessionId]`

Navigate to: `http://localhost:3005/review/<your-review-session-id>`

The UI displays:
- **Session metadata** (organization, period, pay date)
- **Material changes** grouped by metric (net pay, gross pay, deductions, etc.)
- **Blocker highlights** in red
- **Reasoning** for each judgement
- **Approve/Reject buttons** (approve disabled if blockers exist)

**Example View:**
```
Pre-Payroll Review - Session abc123
Organization: Acme Corp
Period: 2024-01-01 to 2024-01-31
Pay Date: 2024-02-05

Material Changes Found: 3
Blockers: 0

Net Pay Changes (1):
  - E001: John Doe
    Change: $4,000.00 → $4,160.00 (+4.0%)
    Reasoning: Net pay increased by 4.0%. Small variation within normal range.
    Rule: R010_MINOR_NET_PAY_CHANGE

New Employees (1):
  - E004: Alice Williams
    Net Pay: $4,160.00
    Reasoning: New employee added. Verify onboarding paperwork, tax withholdings, and pay rate.
    Rule: R005_NEW_EMPLOYEE

[Approve] [Reject]
```

### 2. Via API Endpoint

**Endpoint:** `GET /api/review/[reviewSessionId]`

```bash
curl http://localhost:3005/api/review/<review-session-id>
```

**Response Format:**
```json
{
  "reviewSession": {
    "review_session_id": "abc123",
    "organization_id": "org-456",
    "period_start_date": "2024-01-01",
    "period_end_date": "2024-01-31",
    "pay_date": "2024-02-05",
    "status": "pending_review",
    "has_blockers": false
  },
  "materialChanges": {
    "net_pay": [
      {
        "employee_id": "E001",
        "employee_name": "John Doe",
        "baseline_value": 4000.00,
        "current_value": 4160.00,
        "delta_percentage": 4.0,
        "judgement": {
          "is_material": false,
          "is_blocker": false,
          "reasoning": "Net pay changed by 4.0% (from $4000.00 to $4160.00). Small variation within normal range.",
          "rule_id": "R010_MINOR_NET_PAY_CHANGE",
          "confidence_score": 0.70
        }
      }
    ],
    "new_employee": [
      {
        "employee_id": "E004",
        "employee_name": "Alice Williams",
        "current_value": 4160.00,
        "judgement": {
          "is_material": true,
          "is_blocker": false,
          "reasoning": "New employee E004 added to payroll with net pay of $4160.00. Verify onboarding paperwork, tax withholdings, and pay rate are correct.",
          "rule_id": "R005_NEW_EMPLOYEE",
          "confidence_score": 0.75
        }
      }
    ]
  },
  "summary": {
    "total_material_changes": 3,
    "total_blockers": 0,
    "baseline_employee_count": 3,
    "current_employee_count": 4
  }
}
```

### 3. Via Database Query

**Direct Supabase Query:**
```sql
SELECT
    mj.judgement_id,
    mj.rule_id,
    mj.is_material,
    mj.is_blocker,
    mj.confidence_score,
    mj.reasoning,
    pd.employee_id,
    pd.metric,
    pd.baseline_value,
    pd.current_value,
    pd.delta_percentage
FROM material_judgement mj
JOIN payroll_delta pd ON mj.delta_id = pd.delta_id
WHERE pd.review_session_id = '<your-session-id>'
ORDER BY mj.is_blocker DESC, mj.is_material DESC, pd.employee_id;
```

**Using Supabase Client (Node.js):**
```javascript
const { data, error } = await supabase
  .from('material_judgement')
  .select(`
    *,
    payroll_delta!inner(
      employee_id,
      metric,
      baseline_value,
      current_value,
      delta_percentage
    )
  `)
  .eq('payroll_delta.review_session_id', reviewSessionId)
  .order('is_blocker', { ascending: false })
  .order('is_material', { ascending: false });
```

### 4. Via Python Script

**Test Script:** `tools/test_upload_simple.js` demonstrates full workflow:
```bash
node tools/test_upload_simple.js
```

**Manual Judgement Application:**
```bash
# After uploading CSVs and getting a review_session_id:
python tools/judgement_engine.py <review_session_id>
```

**Output:**
```json
{
  "success": true,
  "judgement_count": 4,
  "material_count": 3,
  "blocker_count": 0
}
```

## How Judgements are Created

### Step-by-Step Process

1. **Upload CSVs**
   - User submits baseline and current CSV files
   - API validates format (see [tools/validate_csv.py](../tools/validate_csv.py))
   - Data stored in `payroll_dataset` and `employee_pay_record` tables

2. **Calculate Deltas**
   - Run: `python tools/diff_calculator.py <review_session_id>`
   - Script compares baseline vs current records
   - Creates `payroll_delta` records for:
     - New employees
     - Removed employees
     - Changes to net_pay, gross_pay, total_deductions
     - Changes to individual pay components
   - Calculates `delta_percentage` for numeric changes

3. **Apply Rules to Deltas**
   - Run: `python tools/judgement_engine.py <review_session_id>`
   - Script fetches all deltas for the session
   - For each delta, applies rules in sequence (R001 → R099)
   - First matching rule determines the judgement
   - Creates `material_judgement` record with:
     - Classification (material/blocker)
     - Confidence score
     - Human-readable reasoning
     - Rule ID

4. **Store Judgements**
   - Bulk insert judgements into `material_judgement` table
   - Linked to deltas via `delta_id` foreign key
   - Batch size: 100 records at a time (Supabase limit)

5. **Review via UI**
   - User navigates to review page
   - API fetches review session, deltas, and judgements via JOIN
   - UI groups changes by metric (net_pay, new_employee, etc.)
   - Displays reasoning for each change
   - Highlights blockers

6. **Approve or Reject**
   - User clicks Approve or Reject button
   - API checks for blockers (if approving)
   - Creates `approval` record with decision and notes
   - Updates `review_session.status` to 'approved' or 'rejected'
   - Audit trail preserved for compliance

## Judgement Rule Reference

For complete details on all 12 deterministic rules, see [DETERMINISTIC_RULES.md](./DETERMINISTIC_RULES.md).

**Quick Reference:**
- **R001-R002:** Blocker rules (negative pay, large decreases)
- **R003-R009:** Material rules (significant changes)
- **R010:** Non-material rule (minor changes)
- **R099:** Default material rule (catch moderate changes)
- **R000:** Catch-all for edge cases

## Key Concepts

### Material vs Non-Material

**Material Changes:**
- Require human review before approval
- May indicate errors, fraud, or unusual circumstances
- Examples: 50% pay increase, new employee, large deduction increase
- Classification: `is_material = true`

**Non-Material Changes:**
- Minor variations within normal ranges
- Typical payroll fluctuations (e.g., 2-5% net pay change)
- No review needed, informational only
- Classification: `is_material = false`

### Blocker vs Non-Blocker

**Blocker Changes:**
- Critical issues that **prevent approval**
- Must be corrected before payroll can be approved
- Examples: Negative net pay, >20% pay decrease
- Classification: `is_blocker = true`
- **Approval button is disabled** when blockers exist

**Non-Blocker Changes:**
- Informational or require review but don't prevent approval
- User can approve after reviewing reasoning
- Examples: New employee, 60% pay increase (might be bonus)
- Classification: `is_blocker = false`

### Confidence Score

- **Scale:** 0.0 to 1.0 (0% to 100%)
- **Purpose:** Indicates how certain the rule is about its classification
- **Usage:** Higher confidence = more critical to review

**Confidence Levels:**
- `1.0`: Absolute certainty (e.g., negative pay is always wrong)
- `0.95`: Very high confidence (e.g., large decreases are usually errors)
- `0.85-0.90`: High confidence (e.g., significant changes)
- `0.70-0.80`: Moderate confidence (e.g., component changes, new employees)
- `0.50`: Low confidence (e.g., no rule matched, edge case)

## Example Judgement Scenarios

### Scenario 1: Normal Pay Increase

**Delta:**
- Employee: E001 (John Doe)
- Metric: net_pay
- Baseline: $4,000.00
- Current: $4,160.00
- Change: +4.0%

**Judgement:**
- Rule: R010_MINOR_NET_PAY_CHANGE
- Is Material: **false** (within normal range)
- Is Blocker: **false**
- Confidence: 0.70
- Reasoning: "Net pay changed by 4.0% (from $4000.00 to $4160.00). Small variation within normal range."
- **Outcome:** No review needed, informational only

### Scenario 2: New Employee

**Delta:**
- Employee: E004 (Alice Williams)
- Metric: new_employee
- Current: $4,160.00 net pay

**Judgement:**
- Rule: R005_NEW_EMPLOYEE
- Is Material: **true** (requires verification)
- Is Blocker: **false** (doesn't prevent approval)
- Confidence: 0.75
- Reasoning: "New employee E004 added to payroll with net pay of $4160.00. Verify onboarding paperwork, tax withholdings, and pay rate are correct."
- **Outcome:** Reviewer checks onboarding docs, then approves

### Scenario 3: Negative Net Pay (BLOCKER)

**Delta:**
- Employee: E002 (Jane Smith)
- Metric: net_pay
- Baseline: $3,600.00
- Current: -$250.00
- Change: -106.9%

**Judgement:**
- Rule: R001_NEGATIVE_NET_PAY
- Is Material: **true**
- Is Blocker: **true** (prevents approval)
- Confidence: 1.0
- Reasoning: "Net pay is negative ($-250.00). This will fail payroll processing and may violate labor laws. Immediate correction required before approval."
- **Outcome:** Approval button disabled, must fix before proceeding

### Scenario 4: Large Pay Increase

**Delta:**
- Employee: E003 (Bob Johnson)
- Metric: net_pay
- Baseline: $3,200.00
- Current: $5,000.00
- Change: +56.25%

**Judgement:**
- Rule: R003_NET_PAY_INCREASE_50PCT
- Is Material: **true** (unusual increase)
- Is Blocker: **false** (might be legitimate bonus/promotion)
- Confidence: 0.90
- Reasoning: "Net pay increased by 56.25% (from $3200.00 to $5000.00). Typical increases are 2-5%. Verify this is due to promotion, bonus, or other legitimate reason rather than data entry error."
- **Outcome:** Reviewer checks for promotion/bonus documentation, then approves

## Audit Trail

All judgements are preserved in the database for compliance and auditing:

**Audit Data Includes:**
- When judgement was created (`created_at`)
- Which rule was applied (`rule_id`)
- Why the rule triggered (`reasoning`)
- Confidence level (`confidence_score`)
- What changed (`payroll_delta` record)
- Who approved/rejected (`approval` table with `approved_by_user_id`)
- When approved/rejected (`approval.approved_at`)

**Query Audit Trail:**
```sql
SELECT
    rs.review_session_id,
    rs.organization_id,
    rs.period_start_date,
    rs.pay_date,
    pd.employee_id,
    pd.metric,
    pd.baseline_value,
    pd.current_value,
    mj.rule_id,
    mj.is_blocker,
    mj.reasoning,
    mj.created_at as judgement_created_at,
    a.decision,
    a.approved_at,
    a.notes as approval_notes
FROM review_session rs
JOIN payroll_delta pd ON rs.review_session_id = pd.review_session_id
JOIN material_judgement mj ON pd.delta_id = mj.delta_id
LEFT JOIN approval a ON rs.review_session_id = a.review_session_id
WHERE rs.organization_id = '<org-id>'
ORDER BY a.approved_at DESC;
```

## Troubleshooting

### "No judgements found for review session"

**Cause:** Judgement engine not run yet
**Solution:**
```bash
python tools/judgement_engine.py <review_session_id>
```

### "No deltas found for this review session"

**Cause:** Diff calculator not run yet
**Solution:**
```bash
python tools/diff_calculator.py <review_session_id>
```

### "API resolved without sending a response"

**Cause:** Known Next.js warning (non-blocking)
**Solution:** Ignore or add explicit response in API route

### Judgements not appearing in UI

**Cause:** API JOIN query may not be fetching judgements
**Solution:** Check `/api/review/[reviewSessionId].ts` includes judgement data in SELECT

## Current vs Future Implementation

### Current (As of 2026-01-28)

| Aspect | Implementation |
|--------|----------------|
| **Rule Engine** | Python script at `tools/judgement_engine.py` |
| **Execution** | Manual CLI: `python tools/judgement_engine.py <id>` |
| **Workflow** | Upload → manual diff → manual judgement → review |
| **Integration** | Called from Node.js test scripts |
| **Automation** | None (fully manual) |

### Future (Post-MVP)

| Aspect | Implementation |
|--------|----------------|
| **Rule Engine** | Python script (same) OR n8n workflow nodes |
| **Execution** | Automatic after CSV upload |
| **Workflow** | Upload → auto diff → auto judgement → review |
| **Integration** | n8n workflows trigger Python scripts |
| **Automation** | Full automation via n8n |

**Note:** n8n integration was originally planned but is not yet implemented. Current MVP uses direct Python execution.

## Related Documentation

- **[DETERMINISTIC_RULES.md](./DETERMINISTIC_RULES.md)** - Complete rule reference with conditions and examples
- **[tools/judgement_engine.py](../tools/judgement_engine.py)** - Rule implementation source code
- **[supabase/migrations/002_refined_schema.sql](../supabase/migrations/002_refined_schema.sql)** - Database schema
- **[pages/api/review/[reviewSessionId].ts](../pages/api/review/[reviewSessionId].ts)** - Review API endpoint

## Summary

- **What:** Judgements classify payroll changes as material/blocker or non-material
- **Where:** Stored in `material_judgement` table in Supabase
- **How:** Python script applies 12 deterministic rules to deltas
- **Review:** Via `/review/[id]` UI page or `/api/review/[id]` endpoint
- **Current Implementation:** Manual Python execution (not n8n)
- **Future:** n8n automation planned for post-MVP

For questions or modifications, see [DETERMINISTIC_RULES.md](./DETERMINISTIC_RULES.md) or review the source code at [tools/judgement_engine.py](../tools/judgement_engine.py).
