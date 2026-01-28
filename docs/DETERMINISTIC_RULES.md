# Deterministic Rules for Pre-Payroll Approval Guard

## Overview

This document describes all deterministic rules used to classify payroll changes as material or blocker changes. These rules are **currently implemented in Python** at [tools/judgement_engine.py](../tools/judgement_engine.py), not in n8n workflows.

## Rule Architecture

**Current Implementation:**
- Location: `tools/judgement_engine.py`
- Language: Python
- Execution: Called manually via CLI: `python tools/judgement_engine.py <review_session_id>`
- Database: Writes judgements to `material_judgement` table in Supabase

**Future Enhancement:**
- n8n integration planned but not yet implemented
- Will automate rule execution after CSV upload

## Rule Categories

Rules are classified into three categories:
1. **BLOCKER** - Critical issues that must be resolved before approval
2. **MATERIAL** - Significant changes requiring review but not blocking approval
3. **NON-MATERIAL** - Minor changes within normal ranges

## Complete Rule List

### BLOCKER RULES

#### R001: Negative Net Pay
**Condition:** Net pay is less than $0
**Classification:** BLOCKER
**Confidence:** 1.0 (100%)

**Trigger:**
```
metric = net_pay
current_value < 0
```

**Reasoning:**
> Net pay is negative (${current_value}). This will fail payroll processing and may violate labor laws. Immediate correction required before approval.

**Example:**
- Employee net pay: -$250.00
- Result: BLOCKS approval until fixed

---

#### R002: Net Pay Decrease > 20%
**Condition:** Net pay decreased by more than 20%
**Classification:** BLOCKER
**Confidence:** 0.95 (95%)

**Trigger:**
```
metric = net_pay
change_type = decrease
delta_percentage < -20
```

**Reasoning:**
> Net pay decreased by {abs(delta_percentage)}% (from ${baseline_value} to ${current_value}). Large decreases may indicate errors in deductions or gross pay. Verify accuracy before processing.

**Example:**
- Baseline: $5,000
- Current: $3,500
- Decrease: 30%
- Result: BLOCKS approval

---

### MATERIAL RULES

#### R003: Net Pay Increase > 50%
**Condition:** Net pay increased by more than 50%
**Classification:** MATERIAL (not blocker)
**Confidence:** 0.90 (90%)

**Trigger:**
```
metric = net_pay
change_type = increase
delta_percentage > 50
```

**Reasoning:**
> Net pay increased by {delta_percentage}% (from ${baseline_value} to ${current_value}). Typical increases are 2-5%. Verify this is due to promotion, bonus, or other legitimate reason rather than data entry error.

**Example:**
- Baseline: $3,000
- Current: $5,000
- Increase: 66.7%
- Result: Requires review, does not block

---

#### R004: Removed Employee
**Condition:** Employee present in baseline but missing from current payroll
**Classification:** MATERIAL
**Confidence:** 0.85 (85%)

**Trigger:**
```
change_type = removed_employee
```

**Reasoning:**
> Employee {employee_id} removed from payroll. Confirm termination was processed correctly and final pay is accurate. Baseline pay was ${baseline_value}.

**Example:**
- Employee E001 in baseline
- Employee E001 not in current
- Result: Requires review of termination

---

#### R005: New Employee
**Condition:** Employee present in current payroll but not in baseline
**Classification:** MATERIAL
**Confidence:** 0.75 (75%)

**Trigger:**
```
change_type = new_employee
```

**Reasoning:**
> New employee {employee_id} added to payroll with net pay of ${current_value}. Verify onboarding paperwork, tax withholdings, and pay rate are correct.

**Example:**
- Employee E005 not in baseline
- Employee E005 in current with $4,200 net pay
- Result: Requires review of onboarding

---

#### R006: Gross Pay Decrease > 15%
**Condition:** Gross pay decreased by more than 15%
**Classification:** MATERIAL
**Confidence:** 0.88 (88%)

**Trigger:**
```
metric = gross_pay
change_type = decrease
delta_percentage < -15
```

**Reasoning:**
> Gross pay decreased by {abs(delta_percentage)}% (from ${baseline_value} to ${current_value}). Verify this reflects actual hours worked or authorized pay reduction.

**Example:**
- Baseline gross: $6,000
- Current gross: $4,800
- Decrease: 20%
- Result: Requires review

---

#### R007: Gross Pay Increase > 50%
**Condition:** Gross pay increased by more than 50%
**Classification:** MATERIAL
**Confidence:** 0.87 (87%)

**Trigger:**
```
metric = gross_pay
change_type = increase
delta_percentage > 50
```

**Reasoning:**
> Gross pay increased by {delta_percentage}% (from ${baseline_value} to ${current_value}). Verify this is due to overtime, bonus, or promotion rather than error.

**Example:**
- Baseline gross: $5,000
- Current gross: $8,000
- Increase: 60%
- Result: Requires review

---

#### R008: Deduction Increase > 100%
**Condition:** Total deductions more than doubled
**Classification:** MATERIAL
**Confidence:** 0.90 (90%)

**Trigger:**
```
metric = total_deductions
change_type = increase
delta_percentage > 100
```

**Reasoning:**
> Total deductions more than doubled (from ${baseline_value} to ${current_value}, {delta_percentage}% increase). Verify new deductions are correct and authorized.

**Example:**
- Baseline deductions: $500
- Current deductions: $1,200
- Increase: 140%
- Result: Requires review

---

#### R009: Component Change > 30%
**Condition:** Individual pay component changed by more than 30%
**Classification:** MATERIAL
**Confidence:** 0.80 (80%)

**Trigger:**
```
metric = component
abs(delta_percentage) > 30
```

**Reasoning:**
> {component_name} changed by {delta_percentage}% (from ${baseline_value} to ${current_value}). Verify this component change is intentional.

**Example:**
- Component: "Health Insurance"
- Baseline: $200
- Current: $280
- Increase: 40%
- Result: Requires review

---

### NON-MATERIAL RULES

#### R010: Minor Net Pay Change
**Condition:** Net pay changed by less than 5%
**Classification:** NON-MATERIAL
**Confidence:** 0.70 (70%)

**Trigger:**
```
metric = net_pay
abs(delta_percentage) < 5
```

**Reasoning:**
> Net pay changed by {delta_percentage}% (from ${baseline_value} to ${current_value}). Small variation within normal range.

**Example:**
- Baseline: $4,000
- Current: $4,150
- Change: 3.75%
- Result: Non-material, no review needed

---

### DEFAULT RULES

#### R099: Default Material Change
**Condition:** Change detected that doesn't match specific rules but has a measurable percentage
**Classification:** MATERIAL
**Confidence:** 0.70 (70%)

**Trigger:**
```
delta_percentage is not None
(No other rule matched)
```

**Reasoning:**
> {metric} changed by {delta_percentage}% (from ${baseline_value} to ${current_value}). Review to ensure this change is expected.

**Example:**
- Any metric change between 5-50%
- Result: Default to material, requires review

---

#### R000: No Rule Match
**Condition:** Edge case where no rule applies
**Classification:** NON-MATERIAL
**Confidence:** 0.50 (50%)

**Trigger:**
```
(No conditions met)
```

**Reasoning:**
> Change detected but does not match standard materiality rules.

**Example:**
- Unusual edge cases
- Result: Non-material by default

---

## Rule Application Logic

### Processing Order
Rules are evaluated in sequence (R001 → R002 → ... → R099 → R000). The **first matching rule** determines the judgement.

### Judgement Fields
Each rule produces a judgement with:
- `is_material`: Boolean (true/false)
- `is_blocker`: Boolean (true/false)
- `confidence_score`: Float 0.0-1.0 (e.g., 0.95 = 95% confidence)
- `reasoning`: Human-readable explanation
- `rule_id`: Unique rule identifier (e.g., "R001_NEGATIVE_NET_PAY")

### Example Judgement
```json
{
  "is_material": true,
  "is_blocker": true,
  "confidence_score": 1.0,
  "reasoning": "Net pay is negative ($-125.00). This will fail payroll processing and may violate labor laws. Immediate correction required before approval.",
  "rule_id": "R001_NEGATIVE_NET_PAY",
  "delta_id": "d4e5f6-a1b2-c3d4-e5f6-a1b2c3d4e5f6"
}
```

## Current vs Future Implementation

### Current State (As of 2026-01-28)
- **Implementation:** Python script at `tools/judgement_engine.py`
- **Execution:** Manual CLI call after upload
- **Command:** `python tools/judgement_engine.py <review_session_id>`
- **Storage:** Writes to `material_judgement` table in Supabase
- **Workflow:**
  1. Upload CSVs via `/api/upload`
  2. Run `python tools/diff_calculator.py <review_session_id>`
  3. Run `python tools/judgement_engine.py <review_session_id>`
  4. View results via `/api/review/<review_session_id>`

### Future Enhancement
- **Plan:** Integrate with n8n workflows for automation
- **Workflow:** Upload → Automatic Diff Calculation → Automatic Judgement → Review
- **Benefits:** No manual script execution, real-time processing
- **Timeline:** Post-MVP enhancement

## How to Review Rules

### Via Code
Read the rule implementation at [tools/judgement_engine.py](../tools/judgement_engine.py) lines 31-171:
```bash
cat tools/judgement_engine.py
```

### Via Database
Query the `material_judgement` table to see applied rules:
```sql
SELECT rule_id, is_material, is_blocker, confidence_score, reasoning
FROM material_judgement
WHERE delta_id IN (
  SELECT delta_id FROM payroll_delta WHERE review_session_id = '<your-session-id>'
);
```

### Via API
Use the review endpoint:
```bash
curl http://localhost:3005/api/review/<review_session_id>
```

## Modifying Rules

### To Change Rule Thresholds
1. Edit `tools/judgement_engine.py`
2. Update the relevant rule (e.g., change R003 from 50% to 40%)
3. Test with sample data
4. Document changes in this file

### To Add New Rules
1. Add new rule function in `apply_rules()` in `tools/judgement_engine.py`
2. Assign new rule ID (e.g., R011)
3. Set appropriate classification and confidence
4. Add test cases
5. Document here in this file

### Example: Adding R011
```python
# RULE 11: BLOCKER - Missing Required Deduction
if metric == 'component' and component_name == 'Tax Withholding' and current_value == 0:
    return {
        'is_material': True,
        'is_blocker': True,
        'confidence_score': 1.0,
        'reasoning': 'Tax withholding is zero. This may violate tax compliance requirements.',
        'rule_id': 'R011_MISSING_TAX_WITHHOLDING'
    }
```

## Testing Rules

### Test with Sample Data
```bash
# Create test review session with known changes
node tools/test_upload_simple.js

# Run judgement engine
python tools/judgement_engine.py <review_session_id>

# Verify results
curl http://localhost:3005/api/review/<review_session_id> | jq '.materialChanges'
```

## Rule Confidence Scores

| Confidence | Meaning | Example Rules |
|------------|---------|---------------|
| 1.0 | Absolute certainty | R001 (negative net pay) |
| 0.95 | Very high confidence | R002 (large decrease) |
| 0.85-0.90 | High confidence | R003-R008 (significant changes) |
| 0.70-0.80 | Moderate confidence | R009-R010, R099 (default) |
| 0.50 | Low confidence | R000 (no match) |

## Summary

- **Total Rules:** 12 rules (2 blockers, 7 material, 1 non-material, 2 defaults)
- **Implementation:** Python at `tools/judgement_engine.py`
- **Future:** n8n integration planned
- **Modification:** Edit Python file, test, document
- **Review:** Via code, database queries, or API endpoints

For judgement workflow and how these rules are applied, see [JUDGEMENTS.md](./JUDGEMENTS.md).
