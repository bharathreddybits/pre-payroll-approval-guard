# Payroll Comparison Workflow

**Objective**: Calculate deterministic differences between baseline and current payroll datasets.

**Status**: Implemented in `tools/diff_calculator.py`

---

## Inputs

- `review_session_id` (UUID): Identifies the review session containing both baseline and current datasets

## Process

### 1. Fetch Datasets

Query the `payroll_dataset` table to retrieve:
- Baseline dataset (previously approved payroll)
- Current dataset (new payroll to review)

```sql
SELECT dataset_id, dataset_type, organization_id
FROM payroll_dataset
WHERE review_session_id = '<review_session_id>'
```

### 2. Fetch Employee Records

For each dataset, fetch all employee pay records:

```sql
SELECT *
FROM employee_pay_record
WHERE dataset_id = '<dataset_id>'
```

Store in memory as dictionaries keyed by `employee_id`.

### 3. Detect Removed Employees

For each employee in baseline but not in current:
- Create delta record with `change_type = 'removed_employee'`
- Set `baseline_value` to their last net_pay
- Set `current_value` to 0
- Set `delta_percentage` to -100%

### 4. Detect New and Changed Employees

For each employee in current dataset:

**If employee is new (not in baseline)**:
- Create delta record with `change_type = 'new_employee'`
- Set `baseline_value` to NULL
- Set `current_value` to their net_pay

**If employee exists in baseline**:
- Compare `net_pay`, `gross_pay`, `total_deductions`
- For each metric that changed:
  - Calculate `delta_absolute` = current - baseline
  - Calculate `delta_percentage` = (delta_absolute / baseline) * 100
  - Set `change_type` to 'increase' or 'decrease'
  - Create delta record

### 5. Compare Pay Components (Optional)

If pay components are available:
- Fetch components for both records
- Compare component amounts by `component_name`
- Create delta records for changed components with `metric = 'component'`

### 6. Store Deltas

Bulk insert all delta records into `payroll_delta` table in batches of 100.

---

## Outputs

Records inserted into `payroll_delta` table with the following fields:
- `review_session_id`
- `organization_id`
- `employee_id`
- `metric` (net_pay | gross_pay | total_deductions | component)
- `component_name` (if metric = component)
- `baseline_value`
- `current_value`
- `delta_absolute`
- `delta_percentage`
- `change_type` (increase | decrease | new_employee | removed_employee)

**Summary statistics**:
- Total delta count
- Baseline employee count
- Current employee count
- New employees count
- Removed employees count

---

## Tools

**Script**: `tools/diff_calculator.py`

**API Endpoint**: `POST /api/compare`

**Usage**:
```bash
python tools/diff_calculator.py <review_session_id>
```

**Dependencies**:
- Python 3.8+
- supabase-py
- python-dotenv

---

## Error Handling

1. **Missing datasets**: Return error if baseline or current dataset not found
2. **Empty datasets**: Handle gracefully, return 0 deltas
3. **Database errors**: Log error and return failure status
4. **Calculation errors**: Skip problematic records, log warning, continue processing

---

## Performance Considerations

- Batch inserts (100 records per batch) to avoid hitting Supabase limits
- Use in-memory dictionaries for fast lookups
- Process components only if available (optional step)
- Expected runtime: <10 seconds for 500 employees

---

## Testing

**Test cases**:
1. No changes (identical datasets) → 0 deltas
2. New employee → delta with change_type='new_employee'
3. Removed employee → delta with change_type='removed_employee'
4. Net pay increase → delta with positive delta_absolute
5. Net pay decrease → delta with negative delta_absolute
6. Component changes → deltas with metric='component'

**Sample test command**:
```bash
python tools/diff_calculator.py test-session-uuid-here
```

---

## Improvements for Future Versions

- [ ] Support for partial dataset comparisons (e.g., department-level)
- [ ] Delta aggregation at team/department level
- [ ] Historical delta tracking (compare against multiple baselines)
- [ ] Performance optimization for >1000 employees (parallel processing)
