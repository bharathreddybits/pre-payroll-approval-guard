import { RuleDefinition } from './types';

export const employeeIdentityRules: RuleDefinition[] = [
  {
    id: 'INACTIVE_EMPLOYEE_PAID',
    name: 'Inactive employee paid',
    category: 'Employee Identity & Context',
    severity: 'blocker',
    confidence: 0.98,
    confidenceLevel: 'VERY_HIGH',
    condition: (ctx) => {
      const status = ctx.current.employment_status;
      const gross = ctx.current.gross_pay;
      return status != null && status.toLowerCase() !== 'active' && gross != null && gross > 0;
    },
    explanation: 'Inactive employee received pay',
    userAction: 'Fix status or reverse payment',
    columnsUsed: ['EmployeeID', 'Employment_Status', 'GrossPay'],
    minTier: 'pro',
    flagReason: 'An employee marked as inactive, terminated, or on leave is receiving pay in the current run.',
    riskStatement: 'Paying inactive employees results in overpayments, tax filing errors, and potential compliance violations.',
    commonCauses: [
      'Termination not processed before payroll cutoff',
      'Status field not updated in HRIS',
      'Leave-of-absence employee incorrectly included',
      'Rehire processed but status not changed back to active',
    ],
    reviewSteps: [
      'Verify employee status in your HRIS system',
      'Check if termination was processed before payroll cutoff',
      'Confirm whether this is a valid final paycheck',
      'If overpayment, initiate reversal process',
    ],
  },
  {
    id: 'MISSING_EMPLOYEE_ID',
    name: 'Missing employee ID',
    category: 'Employee Identity & Context',
    severity: 'blocker',
    confidence: 1.0,
    confidenceLevel: 'VERY_HIGH',
    condition: (ctx) => {
      const empId = ctx.current.employee_id;
      return empId == null || String(empId).trim() === '';
    },
    explanation: 'Employee cannot be uniquely identified',
    userAction: 'Populate EmployeeID',
    columnsUsed: ['EmployeeID'],
    minTier: 'starter',
    flagReason: 'A payroll record exists without an employee identifier.',
    riskStatement: 'Records without employee IDs cannot be matched, audited, or reported. This blocks all downstream processing.',
    commonCauses: [
      'CSV export missing the employee ID column',
      'New hire not yet assigned an employee number',
      'Data formatting issue stripped the ID field',
      'Manual entry with blank identifier',
    ],
    reviewSteps: [
      'Check the source CSV for missing or blank employee ID values',
      'Verify all employees have IDs assigned in your payroll system',
      'Re-export the file with the employee ID column populated',
      'Upload the corrected file',
    ],
  },
  {
    id: 'EMPLOYMENT_STATUS_CHANGE',
    name: 'Employment status changed',
    category: 'Employee Identity & Context',
    severity: 'review',
    confidence: 0.95,
    confidenceLevel: 'VERY_HIGH',
    condition: (ctx) => {
      if (!ctx.baseline) return false;
      const bStatus = ctx.baseline.employment_status;
      const cStatus = ctx.current.employment_status;
      return bStatus != null && cStatus != null && bStatus !== cStatus;
    },
    explanation: 'Employment status changed from baseline (e.g., Active to Terminated).',
    userAction: 'Verify status update in HR records; confirm termination paperwork if applicable.',
    columnsUsed: ['Employment_Status'],
    minTier: 'pro',
    flagReason: 'Employment status changed between the previous and current payroll run.',
    riskStatement: 'Status changes affect benefit eligibility, tax withholding, and final pay calculations.',
    commonCauses: [
      'Employee termination or resignation',
      'Transition from full-time to part-time',
      'Leave of absence initiated or ended',
      'Data entry error in HRIS',
    ],
    reviewSteps: [
      'Confirm the status change matches HR records',
      'Verify final pay calculations for terminated employees',
      'Check benefit and deduction adjustments',
      'Ensure proper tax treatment for the new status',
    ],
  },
  {
    id: 'DUPLICATE_EMPLOYEE_ROWS',
    name: 'Duplicate employee rows',
    category: 'Employee Identity & Context',
    severity: 'blocker',
    confidence: 0.97,
    confidenceLevel: 'VERY_HIGH',
    condition: (ctx) => {
      if (!ctx.allCurrentEmployees) return false;
      const empId = ctx.current.employee_id;
      const count = ctx.allCurrentEmployees.filter(e => e.employee_id === empId).length;
      return count > 1;
    },
    explanation: 'Duplicate employee records found',
    userAction: 'De-duplicate rows',
    columnsUsed: ['EmployeeID'],
    minTier: 'starter',
    flagReason: 'The same employee ID appears more than once in the current payroll file.',
    riskStatement: 'Duplicate rows cause double payments, incorrect tax withholding totals, and reporting errors.',
    commonCauses: [
      'Employee listed under multiple pay groups',
      'CSV export included duplicate rows',
      'Supplemental run merged with regular run',
      'Manual data entry created a duplicate',
    ],
    reviewSteps: [
      'Search for the duplicated employee ID in the source file',
      'Determine which row is correct and remove the duplicate',
      'If both rows are valid, consolidate into one record',
      'Re-upload the corrected file',
    ],
  },
  {
    id: 'PAY_FREQUENCY_CHANGED',
    name: 'Pay frequency changed',
    category: 'Employee Identity & Context',
    severity: 'review',
    confidence: 0.9,
    confidenceLevel: 'HIGH',
    condition: (ctx) => {
      if (!ctx.baseline) return false;
      const bFreq = ctx.baseline.pay_frequency;
      const cFreq = ctx.current.pay_frequency;
      return bFreq != null && cFreq != null && bFreq !== cFreq;
    },
    explanation: 'Confirm payroll setup change; check for proration impacts.',
    userAction: 'Verify pay frequency change and proration',
    columnsUsed: ['Pay_Frequency'],
    minTier: 'pro',
    flagReason: 'Pay frequency changed between payroll runs (e.g., bi-weekly to semi-monthly).',
    riskStatement: 'Pay frequency changes affect salary proration, benefit deduction timing, and tax withholding calculations.',
    commonCauses: [
      'Company-wide payroll calendar change',
      'Employee transferred to a different pay schedule',
      'Data entry error in pay frequency field',
      'Payroll system migration artifact',
    ],
    reviewSteps: [
      'Confirm the frequency change is authorized',
      'Verify salary proration is correct for the new frequency',
      'Check that deduction amounts reflect the new schedule',
      'Validate tax withholding adjustments',
    ],
  },
  {
    id: 'MISSING_PAY_FREQUENCY',
    name: 'Missing pay frequency',
    category: 'Employee Identity & Context',
    severity: 'review',
    confidence: 0.9,
    confidenceLevel: 'HIGH',
    condition: (ctx) => {
      const freq = ctx.current.pay_frequency;
      return freq == null || String(freq).trim() === '';
    },
    explanation: 'Pay frequency missing',
    userAction: 'Assign pay frequency',
    columnsUsed: ['Pay_Frequency'],
    minTier: 'pro',
    flagReason: 'Pay frequency is not set for this employee.',
    riskStatement: 'Missing pay frequency prevents accurate proration, deduction timing, and annual tax calculations.',
    commonCauses: [
      'Field not included in the CSV export',
      'New hire setup incomplete',
      'Payroll system migration did not map frequency',
    ],
    reviewSteps: [
      'Add the pay frequency to the employee record',
      'Verify the correct frequency (weekly, bi-weekly, semi-monthly, monthly)',
      'Re-export with the field populated',
    ],
  },
  {
    id: 'PAY_GROUP_CHANGED',
    name: 'Pay group changed unexpectedly',
    category: 'Employee Identity & Context',
    severity: 'review',
    confidence: 0.88,
    confidenceLevel: 'HIGH',
    condition: (ctx) => {
      if (!ctx.baseline) return false;
      const bGroup = ctx.baseline.pay_group;
      const cGroup = ctx.current.pay_group;
      return bGroup != null && cGroup != null && bGroup !== cGroup;
    },
    explanation: 'Pay group changed from prior run',
    userAction: 'Confirm reassignment',
    columnsUsed: ['Pay_Group'],
    minTier: 'pro',
    flagReason: 'Employee pay group changed between payroll runs.',
    riskStatement: 'Pay group changes can affect payment timing, bank routing, and benefit eligibility.',
    commonCauses: [
      'Employee transferred to a different department or location',
      'Organizational restructuring',
      'Data entry error',
    ],
    reviewSteps: [
      'Confirm the pay group reassignment is intentional',
      'Verify payment routing and timing are correct',
      'Check for downstream impacts on benefits or reporting',
    ],
  },
  {
    id: 'PAY_PERIOD_START_AFTER_END',
    name: 'Pay period start after end date',
    category: 'Employee Identity & Context',
    severity: 'blocker',
    confidence: 0.97,
    confidenceLevel: 'VERY_HIGH',
    condition: (ctx) => {
      const start = ctx.current.metadata?.pay_period_start;
      const end = ctx.current.metadata?.pay_period_end;
      if (!start || !end) return false;
      return new Date(start) > new Date(end);
    },
    explanation: 'Pay period start after end date.',
    userAction: 'Correct dates in source file and re-upload.',
    columnsUsed: ['PayPeriodStart', 'PayPeriodEnd'],
    minTier: 'pro',
    flagReason: 'The pay period start date is after the end date, which is logically impossible.',
    riskStatement: 'Invalid pay period dates cause incorrect proration, tax calculations, and regulatory reporting.',
    commonCauses: [
      'Start and end dates swapped in the CSV',
      'Date format mismatch (MM/DD vs DD/MM)',
      'Copy-paste error from previous period',
    ],
    reviewSteps: [
      'Review the pay period dates in your source file',
      'Correct the date order or format',
      'Re-upload the corrected file',
    ],
  },
  {
    id: 'PAY_PERIOD_MISMATCH',
    name: 'Pay period mismatch',
    category: 'Employee Identity & Context',
    severity: 'blocker',
    confidence: 0.95,
    confidenceLevel: 'VERY_HIGH',
    condition: (ctx) => {
      return false;
    },
    explanation: 'Pay period dates inconsistent across employees',
    userAction: 'Fix period setup',
    columnsUsed: ['PayPeriodStart', 'PayPeriodEnd'],
    minTier: 'pro',
    flagReason: 'Different employees in the same payroll run have different pay period dates.',
    riskStatement: 'Mismatched pay periods indicate mixed payroll runs or data corruption.',
    commonCauses: [
      'Multiple pay periods accidentally merged into one file',
      'Off-cycle or supplemental run mixed with regular run',
      'Manual date entry errors',
    ],
    reviewSteps: [
      'Check if all employees should have the same pay period',
      'Separate different pay periods into distinct files if needed',
      'Correct any date errors and re-upload',
    ],
  },
  {
    id: 'PAY_DATE_IN_PAST',
    name: 'Pay date in past',
    category: 'Employee Identity & Context',
    severity: 'review',
    confidence: 0.85,
    confidenceLevel: 'HIGH',
    condition: (ctx) => {
      const payDate = ctx.current.metadata?.pay_date;
      const periodEnd = ctx.current.metadata?.pay_period_end;
      if (!payDate || !periodEnd) return false;
      return new Date(payDate) < new Date(periodEnd);
    },
    explanation: 'Pay date earlier than period end',
    userAction: 'Confirm payroll calendar',
    columnsUsed: ['PayDate', 'PayPeriodEnd'],
    minTier: 'pro',
    flagReason: 'The pay date is before the pay period end date.',
    riskStatement: 'Early pay dates may indicate calendar errors affecting tax deposit timing.',
    commonCauses: [
      'Payroll calendar not updated for the new period',
      'Holiday-adjusted pay date not reflected',
      'Date field contains wrong value',
    ],
    reviewSteps: [
      'Verify the pay date against your payroll calendar',
      'Confirm if this is an intentional early payment',
      'Correct the date if it is an error',
    ],
  },
  {
    id: 'DEPARTMENT_MISSING',
    name: 'Department missing',
    category: 'Employee Identity & Context',
    severity: 'info',
    confidence: 0.8,
    confidenceLevel: 'MODERATE',
    condition: (ctx) => {
      const dept = ctx.current.department;
      return dept == null || String(dept).trim() === '';
    },
    explanation: 'Department not populated',
    userAction: 'Optional update',
    columnsUsed: ['Department'],
    minTier: 'pro',
    flagReason: 'Department field is blank for this employee.',
    riskStatement: 'Missing department data limits reporting and cost-center allocation accuracy.',
    commonCauses: [
      'Field not included in the payroll export',
      'Employee not assigned to a department in HRIS',
      'New hire setup incomplete',
    ],
    reviewSteps: [
      'Assign a department in your HR system if applicable',
      'This is informational and does not block approval',
    ],
  },
];
