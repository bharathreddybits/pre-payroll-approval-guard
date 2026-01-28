# Workflow: Payroll Snapshot Upload

## Objective
Accept CSV file uploads containing payroll data, validate the format, and store the data in Supabase for comparison and analysis.

## Inputs
- **CSV File**: Payroll data with columns (employee_id, employee_name, department, gross_pay, deductions, net_pay, hours_worked, rate)
- **Organization ID**: UUID identifying the organization
- **Snapshot Date**: The payroll period this snapshot represents

## Required Tools
- `tools/validate_csv.py` - Python script for CSV validation
- Supabase client - Database operations
- n8n workflow - `n8n_workflows/payroll_upload_pipeline.json`

## Process

### 1. Receive Upload
- User uploads CSV via Next.js frontend
- API route `/api/upload` receives the file
- Extract filename and organization_id from request

### 2. Validate CSV Format
**Run**: `tools/validate_csv.py`

Check for:
- Required columns present
- Data types correct (numeric for pay fields)
- No empty employee_ids
- Reasonable value ranges (e.g., net_pay >= 0)
- Date format validity

**Success**: Continue to step 3
**Failure**: Return validation errors to user with specific issues

### 3. Create Snapshot Record
Insert into `payroll_snapshots` table:
```sql
INSERT INTO payroll_snapshots (
    organization_id,
    snapshot_date,
    file_name,
    status
) VALUES (?, ?, ?, 'uploaded')
RETURNING id;
```

### 4. Parse and Store Employee Data
For each row in CSV:
```sql
INSERT INTO snapshot_employees (
    snapshot_id,
    employee_id,
    employee_name,
    department,
    gross_pay,
    deductions,
    net_pay,
    hours_worked,
    rate,
    raw_data
) VALUES (...);
```

Store complete row in `raw_data` JSONB field for audit trail.

### 5. Update Snapshot Metadata
```sql
UPDATE payroll_snapshots
SET
    row_count = [count],
    status = 'processed'
WHERE id = [snapshot_id];
```

## Outputs
- **Success Response**:
  - `snapshot_id`: UUID of created snapshot
  - `row_count`: Number of employees processed
  - `status`: 'processed'

- **Error Response**:
  - `error`: Error message
  - `validation_errors`: List of specific issues (if validation failed)

## Edge Cases

### Invalid CSV Format
- Missing required columns
- **Action**: Return 400 with clear message listing missing columns
- **Example**: "Missing required columns: gross_pay, net_pay"

### Duplicate Snapshot Date
- Snapshot for this org + date already exists
- **Action**: Ask user if they want to replace or keep existing
- **Default**: Reject with 409 Conflict

### Database Connection Failure
- Supabase unavailable or timeout
- **Action**: Return 503 Service Unavailable
- **Retry**: Implement exponential backoff in n8n workflow

### Partial Upload Failure
- Some rows fail to insert
- **Action**: Rollback transaction, delete snapshot record
- **Response**: Return list of problematic rows to user

### Large File Handling
- CSV > 10,000 rows
- **Action**: Process in batches of 1,000 rows
- **Progress**: Use n8n to emit progress updates via webhook

## Cost Considerations
- Supabase: Free tier supports 500MB database
- Average snapshot: ~1KB per employee
- 500 employees = 500KB per snapshot
- Monitor database size and archive old snapshots after 90 days

## Security
- Validate organization_id matches authenticated user
- Use RLS policies to prevent cross-organization access
- Sanitize CSV input to prevent SQL injection
- Limit file size to 10MB maximum

## Next Steps
After successful upload:
1. Trigger payroll comparison workflow (if previous snapshot exists)
2. Update UI to show new snapshot in list
3. Enable review/approval flow
