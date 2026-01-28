# Workflow: Payroll Review UI (MVP)

## Objective
Provide a one-screen interface where payroll reviewers can see all material changes, blockers, and approve or reject the payroll snapshot before processing.

## Inputs
- **Snapshot ID**: UUID of the current payroll snapshot to review
- **User**: Authenticated user with approval permissions

## Required Tools
- Next.js page component: `pages/review/[snapshotId].tsx`
- React components: `components/ChangeBlocker.tsx`, `components/MaterialChange.tsx`
- API route: `/api/review/[snapshotId]`
- Supabase queries for aggregated data

## UI Layout

### Header Section
- Organization name
- Snapshot date
- Comparison period (e.g., "vs. Previous Week")
- Overall status indicator

### Summary Cards (Top Row)
Display key metrics in cards:
1. **Total Changes**: Count of all detected differences
2. **Material Changes**: Count of changes flagged as material
3. **Blockers**: Count of critical issues requiring resolution
4. **Previous Approvals**: History of past reviews

### Blocker Section (If Any)
**Priority**: Show first, must be resolved before approval

For each blocker:
- Employee ID and Name
- Issue type (e.g., "Negative Net Pay", "Missing Tax Withholding")
- Current value vs. Expected
- Severity indicator (red badge)
- Suggested action
- AI reasoning

**Example**:
```
🚫 BLOCKER: Employee #1234 - John Doe
Issue: Negative Net Pay
Current: -$150.00 | Expected: Positive value
Reasoning: Net pay calculation error - deductions exceed gross pay
Action Required: Review deductions or adjust gross pay
```

### Material Changes Section
**Secondary Priority**: Review after blockers

Group by change type:
- Pay Increases
- Pay Decreases
- New Employees
- Removed Employees
- Hours Changes
- Rate Changes

For each material change:
- Employee ID and Name
- Change type
- Old value → New value
- Percentage change (if applicable)
- AI confidence score
- AI reasoning (expandable)

**Example**:
```
⚠️ Pay Increase: Employee #5678 - Jane Smith
Gross Pay: $3,000 → $4,500 (+50%)
Confidence: 95%
Reasoning: Significant increase outside normal range (typical: 2-5%)
Department: Engineering
```

### Non-Material Changes Section (Collapsed by Default)
Summary count with expand option
- "45 other minor changes detected"
- Click to expand full list

### Approval Actions (Bottom)
Two primary buttons:
1. **Approve Payroll** (Green, prominent)
   - Disabled if blockers exist
   - Requires confirmation modal

2. **Reject Payroll** (Red, secondary)
   - Always enabled
   - Opens dialog for rejection notes

Additional options:
- **Export Report** (PDF/CSV of all changes)
- **Request Clarification** (Send to payroll processor)

## Process Flow

### 1. Load Review Data
**API Call**: `GET /api/review/[snapshotId]`

Backend queries:
```sql
-- Get snapshot metadata
SELECT * FROM payroll_snapshots WHERE id = ?;

-- Get all diffs with judgements
SELECT
    pd.*,
    mj.is_material,
    mj.is_blocker,
    mj.confidence_score,
    mj.reasoning
FROM payroll_diffs pd
LEFT JOIN material_judgements mj ON pd.id = mj.diff_id
WHERE pd.current_snapshot_id = ?
ORDER BY mj.is_blocker DESC, mj.is_material DESC;
```

### 2. Categorize Changes
Client-side processing:
- Separate blockers from material changes
- Group material changes by type
- Sort by significance (percentage change, amount)

### 3. Render Components
- `<BlockerAlert>` for each blocker
- `<MaterialChangeCard>` for each material change
- `<ChangeSummary>` for non-material changes

### 4. Handle Approval
**On "Approve Payroll" click**:
1. Show confirmation modal
2. User confirms understanding of changes
3. POST to `/api/approvals`
   ```json
   {
     "snapshot_id": "uuid",
     "status": "approved",
     "notes": "Optional notes"
   }
   ```
4. Update `approvals` table
5. Update snapshot status to 'approved'
6. Redirect to success page or dashboard

### 5. Handle Rejection
**On "Reject Payroll" click**:
1. Open rejection dialog
2. User enters required notes
3. POST to `/api/approvals` with status='rejected'
4. Update records
5. Notify payroll processor (email/webhook)

## Outputs
- **UI Display**: Complete review interface
- **Approval Record**: Entry in `approvals` table
- **Updated Status**: Snapshot status changed to 'approved' or 'rejected'
- **Audit Trail**: Complete history of review actions

## Edge Cases

### No Previous Snapshot
- All employees appear as "new"
- **Action**: Show warning banner
- **Message**: "First snapshot - no comparison available. Review all entries."

### No Material Changes Detected
- Only minor changes
- **Action**: Show success banner
- **Message**: "No material changes detected. Review looks good!"
- **Enable**: Quick approve button

### Blockers Present
- Critical issues exist
- **Action**: Disable approve button
- **Message**: "Resolve all blockers before approval"
- **Guidance**: Link to blocker resolution workflow

### Network Failure During Load
- API call fails
- **Action**: Show error boundary
- **Retry**: Automatic retry with exponential backoff
- **Fallback**: "Unable to load review. Please refresh."

### Multiple Reviewers
- Another user approves while current user reviews
- **Action**: Poll for status changes every 30s
- **Alert**: "This snapshot was approved by [User] at [Time]"

## Performance Optimization

### Data Loading
- Fetch only necessary fields initially
- Lazy load full reasoning text
- Use pagination for >100 changes

### Caching
- Cache material judgements (they don't change)
- Use SWR (stale-while-revalidate) for snapshot data
- Cache employee details client-side

### Cost Considerations
- Minimize Supabase queries (use views)
- Batch load related data
- Use Vercel edge caching for static resources

## Accessibility
- Keyboard navigation support
- Screen reader labels for all interactive elements
- Color-blind friendly indicators (not just red/green)
- ARIA labels for status indicators

## Mobile Responsiveness
- Stack cards vertically on mobile
- Collapsible sections for material changes
- Touch-friendly button sizes
- Horizontal scroll for wide tables

## Testing Checklist
- [ ] Load review with blockers present
- [ ] Load review with no changes
- [ ] Load review with 100+ changes
- [ ] Approve flow (happy path)
- [ ] Reject flow with notes
- [ ] Network failure handling
- [ ] Concurrent approval scenario
- [ ] Mobile view on various devices

## Next Steps
After MVP is working:
1. Add filtering/sorting for material changes
2. Implement search for specific employees
3. Add comparison view (side-by-side old vs new)
4. Export detailed reports
5. Integration with payroll processing systems
