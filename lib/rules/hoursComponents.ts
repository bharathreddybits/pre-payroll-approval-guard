import { RuleDefinition } from './types';

export const hoursComponentsRules: RuleDefinition[] = [
  {
    id: 'ZERO_HOURS_WITH_PAY',
    name: 'Zero hours with pay',
    category: 'Hours Components',
    severity: 'review',
    confidence: 0.80,
    confidenceLevel: 'MODERATE',
    condition: (ctx) => {
      const hours = ctx.current.total_hours_worked;
      const gross = ctx.current.gross_pay;
      if (hours == null || hours !== 0 || gross == null || gross <= 0) return false;
      // Salaried/exempt employees routinely export 0 hours — suppress false positive
      const payType = String(ctx.current.pay_type ?? ctx.current.flsa_classification ?? '').toLowerCase().trim();
      if (payType === 'salary' || payType === 'salaried' || payType === 'exempt') return false;
      return true;
    },
    explanation: 'Pay without hours detected',
    userAction: 'Confirm salaried status or add missing hours',
    columnsUsed: ['TotalHoursWorked', 'GrossPay'],
    minTier: 'pro',
    flagReason: 'Employee has zero hours reported but is receiving pay.',
    riskStatement: 'Zero hours with pay may indicate missing timekeeping data. Salaried exempt employees commonly export zero hours from timekeeping systems — confirm employment type.',
    commonCauses: [
      'Salaried exempt employee whose payroll system exports 0 hours by design',
      'Timesheet not submitted before payroll cutoff',
      'Hours field not mapped from source system',
      'Leave taken but hours not recorded',
    ],
    reviewSteps: [
      'Determine if the employee is salaried/exempt or hourly',
      'If salaried, zero hours is expected — confirm and continue',
      'If hourly, obtain and enter the correct hours worked',
      'Verify timesheet submission status for hourly employees',
    ],
    // NEW: 4-Line Golden Template fields
    judgmentCategory: 'Hours Components Rules',
    triggeredCondition: 'Employee has zero hours reported but is receiving pay',
    whyThisMatters: 'Zero hours with pay may indicate missing timesheet data for hourly employees. Salaried exempt employees often export zero hours by design — confirm employment type first.',
    reviewerAction: 'Confirm if salaried/exempt (zero hours is expected) or hourly (obtain and enter missing hours). Verify timesheet submission for hourly employees.',
    uiHints: {
      defaultExpanded: true,
      requiresAcknowledgement: false,
      highlightLevel: 'AMBER',
    },
    systemLimits: {
      doesNotJudgeAuthorization: true,
      doesNotJudgeLegalCompliance: true,
    },
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
    // NEW: 4-Line Golden Template fields
    judgmentCategory: 'Hours Components Rules',
    triggeredCondition: 'Active employee has zero total hours in current period',
    whyThisMatters: 'May indicate missed timekeeping or unpaid leave not properly flagged, which could result in missing payroll records.',
    reviewerAction: 'Check if employee is on leave, verify timesheet submission status. No action needed if on unpaid leave and properly documented.',
    uiHints: {
      defaultExpanded: false,
      requiresAcknowledgement: false,
      highlightLevel: 'GRAY',
    },
    systemLimits: {
      doesNotJudgeAuthorization: true,
      doesNotJudgeLegalCompliance: true,
    },
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
    // NEW: 4-Line Golden Template fields
    judgmentCategory: 'Hours Components Rules',
    triggeredCondition: 'One or more hours fields contain negative values',
    whyThisMatters: 'Negative hours are not valid in payroll and indicate data entry or system errors that distort time records.',
    reviewerAction: 'Identify which hours field is negative, determine the intended adjustment, correct to non-negative, and re-upload before approval.',
    uiHints: {
      defaultExpanded: true,
      requiresAcknowledgement: true,
      highlightLevel: 'RED',
    },
    systemLimits: {
      doesNotJudgeAuthorization: true,
      doesNotJudgeLegalCompliance: true,
    },
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
      if (hours == null) return false;
      // Determine max possible hours based on pay frequency (24 hours × days in period)
      const rawFreq = String(
        ctx.current.pay_frequency ?? ctx.current.metadata?.pay_frequency ?? ''
      ).toLowerCase().replace(/[\s\-_]/g, '');
      let maxHours = 168; // default: weekly (7 days × 24 hrs)
      if (rawFreq.includes('biweekly') || rawFreq === 'biweekly') {
        maxHours = 336; // 14 days × 24 hrs
      } else if (rawFreq.includes('semimonthly') || rawFreq.includes('semi')) {
        maxHours = 184; // ~15.3 days × 24 hrs
      } else if (rawFreq === 'monthly') {
        maxHours = 744; // 31 days × 24 hrs
      }
      return hours > maxHours;
    },
    explanation: 'Hours exceed pay-period maximum',
    userAction: 'Correct time entry',
    columnsUsed: ['TotalHoursWorked', 'Pay_Frequency'],
    minTier: 'pro',
    flagReason: 'Total hours exceed the maximum physically possible for this pay period length (e.g., 168 for weekly, 336 for bi-weekly).',
    riskStatement: 'Hours above the physical maximum for the pay period indicate data entry errors that will cause overpayments.',
    commonCauses: [
      'Hours entered for wrong pay period length',
      'Decimal point error (e.g., 800 instead of 80)',
      'Multiple periods of hours summed into one field',
      'System import error',
    ],
    reviewSteps: [
      'Verify the pay period length (weekly, bi-weekly, semi-monthly, monthly)',
      'Check for data entry or decimal errors',
      'Correct the hours to the actual amount worked',
      'Re-upload the corrected file',
    ],
    // NEW: 4-Line Golden Template fields
    judgmentCategory: 'Hours Components Rules',
    triggeredCondition: 'Total hours exceed the physical maximum for this pay period (168 weekly / 336 bi-weekly / 184 semi-monthly / 744 monthly)',
    whyThisMatters: 'Hours above the physical maximum for the pay period indicate data entry errors that will cause overpayments and incorrect labor cost allocation.',
    reviewerAction: 'Verify pay period length and frequency, check for data entry or decimal errors, correct hours to actual amount worked, and re-upload before approval.',
    uiHints: {
      defaultExpanded: true,
      requiresAcknowledgement: true,
      highlightLevel: 'RED',
    },
    systemLimits: {
      doesNotJudgeAuthorization: true,
      doesNotJudgeLegalCompliance: true,
    },
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
    // NEW: 4-Line Golden Template fields
    judgmentCategory: 'Hours Components Rules',
    triggeredCondition: 'Total hours do not equal the sum of regular, overtime, and other hours',
    whyThisMatters: 'Hours component mismatch causes incorrect pay calculations, audit failures, and compliance violations.',
    reviewerAction: 'Compare total hours against sum of components, identify missing or incorrect component, correct values to reconcile, and re-upload.',
    uiHints: {
      defaultExpanded: true,
      requiresAcknowledgement: true,
      highlightLevel: 'RED',
    },
    systemLimits: {
      doesNotJudgeAuthorization: true,
      doesNotJudgeLegalCompliance: true,
    },
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
    // NEW: 4-Line Golden Template fields
    judgmentCategory: 'Hours Components Rules',
    triggeredCondition: 'Total hours worked increased by 100% or more',
    whyThisMatters: 'A doubling of hours may indicate overtime errors, duplicate entries, or data issues that require verification against time records.',
    reviewerAction: 'Verify overtime was actually worked and approved, check if prior period had reduced hours, confirm no duplicate entries, validate against timekeeping.',
    uiHints: {
      defaultExpanded: true,
      requiresAcknowledgement: false,
      highlightLevel: 'AMBER',
    },
    systemLimits: {
      doesNotJudgeAuthorization: true,
      doesNotJudgeLegalCompliance: true,
    },
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
    // NEW: 4-Line Golden Template fields
    judgmentCategory: 'Hours Components Rules',
    triggeredCondition: 'Total hours dropped by 50% or more',
    whyThisMatters: 'A large hours decrease may mean missing timesheets or unreported leave that could result in underpayment.',
    reviewerAction: 'Verify employee schedule for this period, check for approved leave, confirm timesheet was fully submitted, validate against timekeeping system.',
    uiHints: {
      defaultExpanded: true,
      requiresAcknowledgement: false,
      highlightLevel: 'AMBER',
    },
    systemLimits: {
      doesNotJudgeAuthorization: true,
      doesNotJudgeLegalCompliance: true,
    },
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
    // NEW: 4-Line Golden Template fields
    judgmentCategory: 'Hours Components Rules',
    triggeredCondition: 'Employee has overtime hours but no regular hours recorded',
    whyThisMatters: 'Overtime without regular hours is unusual and often indicates a data classification error that affects pay calculations.',
    reviewerAction: 'Review employee time records, verify hours are categorized correctly, check if regular hours should be populated, correct classification if needed.',
    uiHints: {
      defaultExpanded: true,
      requiresAcknowledgement: false,
      highlightLevel: 'AMBER',
    },
    systemLimits: {
      doesNotJudgeAuthorization: true,
      doesNotJudgeLegalCompliance: true,
    },
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
    // NEW: 4-Line Golden Template fields
    judgmentCategory: 'Hours Components Rules',
    triggeredCondition: 'The sum of paid hours components exceeds total hours worked',
    whyThisMatters: 'Overstated paid hours lead to overpayments, incorrect labor cost allocation, and compliance violations.',
    reviewerAction: 'Compare sum of hour components against total, identify double-counted category, correct totals to match, and re-upload before approval.',
    uiHints: {
      defaultExpanded: true,
      requiresAcknowledgement: true,
      highlightLevel: 'RED',
    },
    systemLimits: {
      doesNotJudgeAuthorization: true,
      doesNotJudgeLegalCompliance: true,
    },
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
    // NEW: 4-Line Golden Template fields
    judgmentCategory: 'Hours Components Rules',
    triggeredCondition: 'Other paid hours (PTO/leave) doubled or more from previous period',
    whyThisMatters: 'Large PTO spikes are often expected but worth noting for budget and coverage planning purposes.',
    reviewerAction: 'Verify the PTO usage is approved. No action needed if this is expected for year-end or scheduled leave.',
    uiHints: {
      defaultExpanded: false,
      requiresAcknowledgement: false,
      highlightLevel: 'GRAY',
    },
    systemLimits: {
      doesNotJudgeAuthorization: true,
      doesNotJudgeLegalCompliance: true,
    },
  },
];
