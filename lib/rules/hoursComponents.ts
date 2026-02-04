import { RuleDefinition } from './types';

export const hoursComponentsRules: RuleDefinition[] = [
  {
    id: 'ZERO_HOURS_WITH_PAY',
    name: 'Zero hours with pay',
    category: 'Hours Components',
    severity: 'blocker',
    confidence: 1.0,
    confidenceLevel: 'VERY_HIGH',
    condition: (ctx) => {
      const hours = ctx.current.total_hours_worked;
      const gross = ctx.current.gross_pay;
      return hours != null && hours === 0 && gross != null && gross > 0;
    },
    explanation: 'Pay without hours detected',
    userAction: 'Add hours or confirm salaried',
    columnsUsed: ['TotalHoursWorked', 'GrossPay'],
    minTier: 'pro',
    flagReason: 'Employee has zero hours reported but is receiving pay.',
    riskStatement: 'Zero hours with pay may indicate missing timekeeping data or incorrect salaried classification.',
    commonCauses: [
      'Timesheet not submitted before payroll cutoff',
      'Salaried employee incorrectly classified as hourly',
      'Hours field not mapped from source system',
      'Leave taken but hours not recorded',
    ],
    reviewSteps: [
      'Determine if the employee is salaried or hourly',
      'If hourly, obtain and enter the correct hours',
      'If salaried, confirm hours are not required',
      'Verify timesheet submission status',
    ],
  },
  {
    id: 'TOTAL_HOURS_ZERO_ACTIVE',
    name: 'Total hours =0 for active employee',
    category: 'Hours Components',
    severity: 'info',
    confidence: 0.8,
    confidenceLevel: 'MODERATE',
    condition: (ctx) => {
      const hours = ctx.current.total_hours_worked;
      const status = ctx.current.employment_status;
      return hours != null && hours === 0 && status != null && status.toLowerCase() === 'active';
    },
    explanation: 'Total hours =0 for active employee.',
    userAction: 'No action if on unpaid leave.',
    columnsUsed: ['TotalHoursWorked', 'Employment_Status'],
    minTier: 'pro',
    flagReason: 'An active employee has zero total hours in the current period.',
    riskStatement: 'May indicate missed timekeeping or unpaid leave not properly flagged.',
    commonCauses: [
      'Employee on unpaid leave',
      'Timesheet not yet submitted',
      'Salaried employee with no hours tracking',
    ],
    reviewSteps: [
      'Check if the employee is on leave',
      'Verify timesheet submission status',
      'No action needed if this is expected',
    ],
  },
  {
    id: 'NEGATIVE_HOURS',
    name: 'Negative hours',
    category: 'Hours Components',
    severity: 'blocker',
    confidence: 0.99,
    confidenceLevel: 'VERY_HIGH',
    condition: (ctx) => {
      const reg = ctx.current.regular_hours;
      const ot = ctx.current.overtime_hours;
      const other = ctx.current.other_paid_hours;
      return (reg != null && reg < 0) || (ot != null && ot < 0) || (other != null && other < 0);
    },
    explanation: 'Negative hours are invalid',
    userAction: 'Correct time data',
    columnsUsed: ['RegularHours', 'OvertimeHours', 'OtherPaidHours'],
    minTier: 'pro',
    flagReason: 'One or more hours fields contain negative values.',
    riskStatement: 'Negative hours are not valid in payroll and indicate data entry or system errors.',
    commonCauses: [
      'Retroactive time adjustment entered incorrectly',
      'System error during time import',
      'Manual correction with wrong sign',
    ],
    reviewSteps: [
      'Identify which hours field is negative',
      'Determine the intended adjustment',
      'Correct the value to a non-negative number',
      'Re-upload the corrected file',
    ],
  },
  {
    id: 'HOURS_EXCEED_MAX',
    name: 'Hours exceed plausible max',
    category: 'Hours Components',
    severity: 'blocker',
    confidence: 0.96,
    confidenceLevel: 'VERY_HIGH',
    condition: (ctx) => {
      const hours = ctx.current.total_hours_worked;
      return hours != null && hours > 168;
    },
    explanation: 'Hours exceed weekly maximum',
    userAction: 'Correct time entry',
    columnsUsed: ['TotalHoursWorked'],
    minTier: 'pro',
    flagReason: 'Total hours exceed 168 (the maximum possible hours in a 7-day week).',
    riskStatement: 'Hours above the physical weekly maximum indicate data entry errors that will cause overpayments.',
    commonCauses: [
      'Hours entered for wrong pay period length',
      'Decimal point error (e.g., 800 instead of 80)',
      'Multiple weeks of hours summed into one field',
      'System import error',
    ],
    reviewSteps: [
      'Verify the pay period length (weekly, bi-weekly, etc.)',
      'Check for data entry or decimal errors',
      'Correct the hours to the actual amount worked',
      'Re-upload the corrected file',
    ],
  },
  {
    id: 'HOURS_SUM_MISMATCH',
    name: 'TotalHoursWorked != sum of regular/OT/other',
    category: 'Hours Components',
    severity: 'blocker',
    confidence: 0.96,
    confidenceLevel: 'VERY_HIGH',
    condition: (ctx) => {
      const total = ctx.current.total_hours_worked;
      const reg = ctx.current.regular_hours ?? 0;
      const ot = ctx.current.overtime_hours ?? 0;
      const other = ctx.current.other_paid_hours ?? 0;
      if (total == null) return false;
      const sum = reg + ot + other;
      return Math.abs(total - sum) > 0.01;
    },
    explanation: 'TotalHoursWorked != sum of regular/OT/other.',
    userAction: 'Reconcile hour components.',
    columnsUsed: ['TotalHoursWorked', 'RegularHours', 'OvertimeHours', 'OtherPaidHours'],
    minTier: 'pro',
    flagReason: 'Total hours do not equal the sum of regular, overtime, and other hours.',
    riskStatement: 'Hours component mismatch causes incorrect pay calculations and audit failures.',
    commonCauses: [
      'Missing hours category not included',
      'Rounding differences between source systems',
      'Manual total entered without updating components',
      'PTO or holiday hours not categorized',
    ],
    reviewSteps: [
      'Compare total hours against the sum of components',
      'Identify the missing or incorrect component',
      'Correct the values so they reconcile',
      'Re-upload the corrected file',
    ],
  },
  {
    id: 'MATERIAL_HOURS_INCREASE',
    name: 'Material hours increase',
    category: 'Hours Components',
    severity: 'review',
    confidence: 0.94,
    confidenceLevel: 'VERY_HIGH',
    condition: (ctx) => {
      if (ctx.metric !== 'total_hours_worked' || !ctx.baseline) return false;
      const bHours = ctx.baseline.total_hours_worked;
      const cHours = ctx.current.total_hours_worked;
      return bHours != null && bHours > 0 && cHours != null && cHours >= bHours * 2;
    },
    explanation: 'Hours doubled from last payroll',
    userAction: 'Confirm overtime',
    columnsUsed: ['TotalHoursWorked'],
    minTier: 'pro',
    flagReason: 'Total hours worked increased by 100% or more compared to the previous period.',
    riskStatement: 'A doubling of hours may indicate overtime errors, duplicate entries, or data issues.',
    commonCauses: [
      'Significant overtime approved for this period',
      'Part-time employee moved to full-time',
      'Prior period had reduced hours (leave, holiday)',
      'Data entry error or duplicate time entries',
    ],
    reviewSteps: [
      'Verify overtime was actually worked and approved',
      'Check if prior period had reduced hours for a valid reason',
      'Confirm there are no duplicate time entries',
      'Validate the hours against timekeeping records',
    ],
  },
  {
    id: 'MATERIAL_HOURS_DECREASE',
    name: 'Material hours decrease',
    category: 'Hours Components',
    severity: 'review',
    confidence: 0.92,
    confidenceLevel: 'HIGH',
    condition: (ctx) => {
      if (ctx.metric !== 'total_hours_worked' || !ctx.baseline) return false;
      const bHours = ctx.baseline.total_hours_worked;
      const cHours = ctx.current.total_hours_worked;
      return bHours != null && bHours > 0 && cHours != null && cHours <= bHours * 0.5;
    },
    explanation: 'Significant drop in hours',
    userAction: 'Confirm schedule',
    columnsUsed: ['TotalHoursWorked'],
    minTier: 'pro',
    flagReason: 'Total hours dropped by 50% or more compared to the previous period.',
    riskStatement: 'A large hours decrease may mean missing timesheets or unreported leave.',
    commonCauses: [
      'Employee took leave or vacation',
      'Schedule reduced (full-time to part-time)',
      'Timesheet not submitted in time',
      'Data truncation or import error',
    ],
    reviewSteps: [
      'Verify the employee schedule for this period',
      'Check for approved leave or time off',
      'Confirm timesheet was fully submitted',
      'Validate against timekeeping system records',
    ],
  },
  {
    id: 'OVERTIME_WITHOUT_REGULAR',
    name: 'Overtime without regular hours',
    category: 'Hours Components',
    severity: 'review',
    confidence: 0.93,
    confidenceLevel: 'HIGH',
    condition: (ctx) => {
      const ot = ctx.current.overtime_hours;
      const reg = ctx.current.regular_hours;
      return ot != null && ot > 0 && (reg == null || reg === 0);
    },
    explanation: 'Overtime logged without regular hours',
    userAction: 'Verify OT entry',
    columnsUsed: ['RegularHours', 'OvertimeHours'],
    minTier: 'pro',
    flagReason: 'Employee has overtime hours but no regular hours recorded.',
    riskStatement: 'Overtime without regular hours is unusual and often indicates a data classification error.',
    commonCauses: [
      'Regular hours classified as overtime',
      'Hours field mapping error during import',
      'Employee only worked callback/on-call hours',
      'Time categorization rules misconfigured',
    ],
    reviewSteps: [
      'Review the employee time records',
      'Verify hours are categorized correctly',
      'Check if regular hours should be populated',
      'Correct the classification if needed',
    ],
  },
  {
    id: 'PAID_HOURS_EXCEED_TOTAL',
    name: 'Paid hours exceed total',
    category: 'Hours Components',
    severity: 'blocker',
    confidence: 0.98,
    confidenceLevel: 'VERY_HIGH',
    condition: (ctx) => {
      const total = ctx.current.total_hours_worked;
      const reg = ctx.current.regular_hours ?? 0;
      const ot = ctx.current.overtime_hours ?? 0;
      const other = ctx.current.other_paid_hours ?? 0;
      if (total == null) return false;
      return (reg + ot + other) > total + 0.01;
    },
    explanation: 'Paid hours exceed total',
    userAction: 'Fix breakdown',
    columnsUsed: ['RegularHours', 'OvertimeHours', 'OtherPaidHours', 'TotalHoursWorked'],
    minTier: 'pro',
    flagReason: 'The sum of paid hours components exceeds total hours worked.',
    riskStatement: 'Overstated paid hours lead to overpayments and incorrect labor cost allocation.',
    commonCauses: [
      'Double-counted hours across categories',
      'PTO hours added on top of worked hours',
      'Total hours field not updated after corrections',
    ],
    reviewSteps: [
      'Compare the sum of hour components against the total',
      'Identify the double-counted category',
      'Correct the totals to match',
      'Re-upload the corrected file',
    ],
  },
  {
    id: 'PTO_SPIKE',
    name: 'PTO spike',
    category: 'Hours Components',
    severity: 'info',
    confidence: 0.85,
    confidenceLevel: 'MODERATE',
    condition: (ctx) => {
      if (!ctx.baseline) return false;
      const bOther = ctx.baseline.other_paid_hours;
      const cOther = ctx.current.other_paid_hours;
      return bOther != null && bOther > 0 && cOther != null && cOther >= bOther * 2;
    },
    explanation: 'PTO spike detected',
    userAction: 'FYI only',
    columnsUsed: ['OtherPaidHours'],
    minTier: 'pro',
    flagReason: 'Other paid hours (PTO/leave) doubled or more from the previous period.',
    riskStatement: 'Large PTO spikes are often expected but worth noting for budget and coverage planning.',
    commonCauses: [
      'Year-end PTO usage before expiration',
      'Extended vacation or personal leave',
      'Company holiday week',
    ],
    reviewSteps: [
      'Verify the PTO usage is approved',
      'No action needed if this is expected',
    ],
  },
];
