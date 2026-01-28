# Material Judgement Workflow

**Objective**: Apply deterministic rules to payroll deltas, flagging material changes and blockers.

**Status**: Implemented in `tools/judgement_engine.py`

---

## Inputs

- `review_session_id` (UUID): Identifies the review session containing calculated deltas

## Process

### 1. Fetch Deltas

Query all deltas for the review session:

```sql
SELECT *
FROM payroll_delta
WHERE review_session_id = '<review_session_id>'
```

### 2. Apply Judgement Rules

For each delta, apply the following rules in order:

#### **RULE 1: BLOCKER - Negative Net Pay**
- **Condition**: `metric = 'net_pay' AND current_value < 0`
- **Result**:
  - `is_blocker = TRUE`
  - `is_material = TRUE`
  - `confidence_score = 1.0`
  - `rule_id = 'R001_NEGATIVE_NET_PAY'`
- **Reasoning**: "Net pay is negative ($X). This will fail payroll processing and may violate labor laws. Immediate correction required."

#### **RULE 2: BLOCKER - Net Pay Decrease > 20%**
- **Condition**: `metric = 'net_pay' AND change_type = 'decrease' AND delta_percentage < -20`
- **Result**:
  - `is_blocker = TRUE`
  - `is_material = TRUE`
  - `confidence_score = 0.95`
  - `rule_id = 'R002_NET_PAY_DECREASE_20PCT'`
- **Reasoning**: "Net pay decreased by X%. Large decreases may indicate errors in deductions or gross pay. Verify accuracy before processing."

#### **RULE 3: MATERIAL - Net Pay Increase > 50%**
- **Condition**: `metric = 'net_pay' AND change_type = 'increase' AND delta_percentage > 50`
- **Result**:
  - `is_blocker = FALSE`
  - `is_material = TRUE`
  - `confidence_score = 0.90`
  - `rule_id = 'R003_NET_PAY_INCREASE_50PCT'`
- **Reasoning**: "Net pay increased by X%. Typical increases are 2-5%. Verify this is due to promotion, bonus, or other legitimate reason."

#### **RULE 4: MATERIAL - Removed Employee**
- **Condition**: `change_type = 'removed_employee'`
- **Result**:
  - `is_blocker = FALSE`
  - `is_material = TRUE`
  - `confidence_score = 0.85`
  - `rule_id = 'R004_REMOVED_EMPLOYEE'`
- **Reasoning**: "Employee removed from payroll. Confirm termination was processed correctly and final pay is accurate."

#### **RULE 5: MATERIAL - New Employee**
- **Condition**: `change_type = 'new_employee'`
- **Result**:
  - `is_blocker = FALSE`
  - `is_material = TRUE`
  - `confidence_score = 0.75`
  - `rule_id = 'R005_NEW_EMPLOYEE'`
- **Reasoning**: "New employee added to payroll. Verify onboarding paperwork, tax withholdings, and pay rate are correct."

#### **RULE 6: MATERIAL - Gross Pay Decrease > 15%**
- **Condition**: `metric = 'gross_pay' AND change_type = 'decrease' AND delta_percentage < -15`
- **Result**:
  - `is_blocker = FALSE`
  - `is_material = TRUE`
  - `confidence_score = 0.88`
  - `rule_id = 'R006_GROSS_PAY_DECREASE_15PCT'`
- **Reasoning**: "Gross pay decreased by X%. Verify this reflects actual hours worked or authorized pay reduction."

#### **RULE 7: MATERIAL - Gross Pay Increase > 50%**
- **Condition**: `metric = 'gross_pay' AND change_type = 'increase' AND delta_percentage > 50`
- **Result**:
  - `is_blocker = FALSE`
  - `is_material = TRUE`
  - `confidence_score = 0.87`
  - `rule_id = 'R007_GROSS_PAY_INCREASE_50PCT'`
- **Reasoning**: "Gross pay increased by X%. Verify this is due to overtime, bonus, or promotion rather than error."

#### **RULE 8: MATERIAL - Deduction Increase > 100%**
- **Condition**: `metric = 'total_deductions' AND change_type = 'increase' AND delta_percentage > 100`
- **Result**:
  - `is_blocker = FALSE`
  - `is_material = TRUE`
  - `confidence_score = 0.90`
  - `rule_id = 'R008_DEDUCTION_INCREASE_100PCT'`
- **Reasoning**: "Total deductions more than doubled. Verify new deductions are correct and authorized."

#### **RULE 9: MATERIAL - Component Change > 30%**
- **Condition**: `metric = 'component' AND abs(delta_percentage) > 30`
- **Result**:
  - `is_blocker = FALSE`
  - `is_material = TRUE`
  - `confidence_score = 0.80`
  - `rule_id = 'R009_COMPONENT_CHANGE_30PCT'`
- **Reasoning**: "Component changed by X%. Verify this component change is intentional."

#### **RULE 10: Minor Change (Non-Material)**
- **Condition**: `metric = 'net_pay' AND abs(delta_percentage) < 5`
- **Result**:
  - `is_blocker = FALSE`
  - `is_material = FALSE`
  - `confidence_score = 0.70`
  - `rule_id = 'R010_MINOR_NET_PAY_CHANGE'`
- **Reasoning**: "Net pay changed by X%. Small variation within normal range."

#### **DEFAULT: Moderate Change**
- **Condition**: All other changes
- **Result**:
  - `is_blocker = FALSE`
  - `is_material = TRUE`
  - `confidence_score = 0.70`
  - `rule_id = 'R099_DEFAULT_MATERIAL_CHANGE'`
- **Reasoning**: "Change detected but does not match standard materiality rules. Review to ensure this change is expected."

### 3. Store Judgements

Bulk insert all judgement records into `material_judgement` table in batches of 100.

---

## Outputs

Records inserted into `material_judgement` table with the following fields:
- `delta_id` (FK to payroll_delta)
- `is_material` (BOOLEAN)
- `is_blocker` (BOOLEAN)
- `confidence_score` (0.0 to 1.0)
- `reasoning` (TEXT)
- `rule_id` (TEXT)

**Summary statistics**:
- Total judgement count
- Material changes count
- Blockers count

---

## Tools

**Script**: `tools/judgement_engine.py`

**API Endpoint**: `POST /api/compare` (calls judgement engine after diff calculation)

**Usage**:
```bash
python tools/judgement_engine.py <review_session_id>
```

**Dependencies**:
- Python 3.8+
- supabase-py
- python-dotenv

---

## Rule Hierarchy

Rules are applied in order of priority:
1. **Blockers** (rules that prevent approval)
2. **High-confidence material changes** (>90%)
3. **Medium-confidence material changes** (75-90%)
4. **Low-confidence material changes** (<75%)
5. **Non-material changes**

**First matching rule wins** - once a rule matches, no further rules are evaluated for that delta.

---

## Confidence Scores

| Score | Meaning | Action Required |
|-------|---------|-----------------|
| 1.00 | Certain blocker | Must resolve before approval |
| 0.90-0.99 | Very likely material | Requires careful review |
| 0.75-0.89 | Likely material | Should review |
| 0.50-0.74 | Possibly material | Optional review |
| <0.50 | Not material | No action needed |

---

## Customization (Future)

Rules are hardcoded for MVP. Future versions will support:
- [ ] Organization-specific thresholds (e.g., 10% vs 20% for net pay decrease)
- [ ] Industry-specific rules (e.g., seasonal workers, commission-based)
- [ ] Machine learning models for anomaly detection
- [ ] Custom rule builder UI for admins

---

## Testing

**Test cases**:
1. Negative net pay → BLOCKER
2. 25% net pay decrease → BLOCKER
3. 60% net pay increase → MATERIAL, not blocker
4. New employee → MATERIAL
5. Removed employee → MATERIAL
6. 2% net pay change → NON-MATERIAL
7. 120% deduction increase → MATERIAL

**Sample test command**:
```bash
python tools/judgement_engine.py test-session-uuid-here
```

---

## Error Handling

1. **No deltas found**: Return success with 0 judgements
2. **Database errors**: Log error and return failure status
3. **Invalid delta data**: Skip problematic records, log warning, continue processing
4. **Rule evaluation errors**: Use default rule as fallback

---

## Performance Considerations

- Batch inserts (100 records per batch)
- Simple conditional logic (no external API calls for MVP)
- Expected runtime: <5 seconds for 500 deltas
- Memory efficient (processes deltas one at a time)

---

## Audit Trail

All judgements are immutable once created. The `rule_id` field ensures traceability:
- Which rule flagged this change?
- What was the reasoning?
- What was the confidence score?

This supports compliance requirements and helps users understand why something was flagged.

---

## Improvements for Future Versions

- [ ] Rule versioning (track which rule version was applied)
- [ ] A/B testing for rule thresholds
- [ ] Feedback loop (users mark false positives → improve rules)
- [ ] Explanation engine (detailed "why" for each judgement)
