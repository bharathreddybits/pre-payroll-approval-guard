import { RuleDefinition } from './types';

export const employeeIdentityRules: RuleDefinition[] = [
  {
    id: 'INACTIVE_EMPLOYEE_PAID',
    name: 'Inactive employee paid',
    category: 'Employee Identity & Context',
    severity: 'blocker',
    confidence: 0.98,
    condition: (ctx) => {
      const status = ctx.current.employment_status;
      const gross = ctx.current.gross_pay;
      return status != null && status.toLowerCase() !== 'active' && gross != null && gross > 0;
    },
    explanation: 'Inactive employee received pay',
    userAction: 'Fix status or reverse payment',
    columnsUsed: ['EmployeeID', 'Employment_Status', 'GrossPay'],
    minTier: 'pro',
  },
  {
    id: 'MISSING_EMPLOYEE_ID',
    name: 'Missing employee ID',
    category: 'Employee Identity & Context',
    severity: 'blocker',
    confidence: 1.0,
    condition: (ctx) => {
      const empId = ctx.current.employee_id;
      return empId == null || String(empId).trim() === '';
    },
    explanation: 'Employee cannot be uniquely identified',
    userAction: 'Populate EmployeeID',
    columnsUsed: ['EmployeeID'],
    minTier: 'starter',
  },
  {
    id: 'EMPLOYMENT_STATUS_CHANGE',
    name: 'Employment status changed',
    category: 'Employee Identity & Context',
    severity: 'review',
    confidence: 0.95,
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
  },
  {
    id: 'DUPLICATE_EMPLOYEE_ROWS',
    name: 'Duplicate employee rows',
    category: 'Employee Identity & Context',
    severity: 'blocker',
    confidence: 0.97,
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
  },
  {
    id: 'PAY_FREQUENCY_CHANGED',
    name: 'Pay frequency changed',
    category: 'Employee Identity & Context',
    severity: 'review',
    confidence: 0.9,
    condition: (ctx) => {
      if (!ctx.baseline) return false;
      const bFreq = ctx.baseline.pay_frequency;
      const cFreq = ctx.current.pay_frequency;
      return bFreq != null && cFreq != null && bFreq !== cFreq;
    },
    explanation: 'Confirm payroll setup change; check for proration impacts.',
    userAction: 'Assign pay frequency',
    columnsUsed: ['Pay_Frequency'],
    minTier: 'pro',
  },
  {
    id: 'MISSING_PAY_FREQUENCY',
    name: 'Missing pay frequency',
    category: 'Employee Identity & Context',
    severity: 'review',
    confidence: 0.9,
    condition: (ctx) => {
      const freq = ctx.current.pay_frequency;
      return freq == null || String(freq).trim() === '';
    },
    explanation: 'Pay frequency missing',
    userAction: 'Assign pay frequency',
    columnsUsed: ['Pay_Frequency'],
    minTier: 'pro',
  },
  {
    id: 'PAY_GROUP_CHANGED',
    name: 'Pay group changed unexpectedly',
    category: 'Employee Identity & Context',
    severity: 'review',
    confidence: 0.88,
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
  },
  {
    id: 'PAY_PERIOD_START_AFTER_END',
    name: 'Pay period start after end date',
    category: 'Employee Identity & Context',
    severity: 'blocker',
    confidence: 0.97,
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
  },
  {
    id: 'PAY_PERIOD_MISMATCH',
    name: 'Pay period mismatch',
    category: 'Employee Identity & Context',
    severity: 'blocker',
    confidence: 0.95,
    condition: (ctx) => {
      // This is a cross-employee check — handled at the engine level
      // Individual condition returns false; the engine checks consistency
      return false;
    },
    explanation: 'Pay period dates inconsistent across employees',
    userAction: 'Fix period setup',
    columnsUsed: ['PayPeriodStart', 'PayPeriodEnd'],
    minTier: 'pro',
  },
  {
    id: 'PAY_DATE_IN_PAST',
    name: 'Pay date in past',
    category: 'Employee Identity & Context',
    severity: 'review',
    confidence: 0.85,
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
  },
  {
    id: 'DEPARTMENT_MISSING',
    name: 'Department missing',
    category: 'Employee Identity & Context',
    severity: 'info',
    confidence: 0.8,
    condition: (ctx) => {
      const dept = ctx.current.department;
      return dept == null || String(dept).trim() === '';
    },
    explanation: 'Department not populated',
    userAction: 'Optional update',
    columnsUsed: ['Department'],
    minTier: 'pro',
  },
];
