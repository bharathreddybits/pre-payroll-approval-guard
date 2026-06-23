import { RuleDefinition } from './types';

export const deductionsComponentsRules: RuleDefinition[] = [
  {
    id: 'DEDUCTIONS_EXCEED_GROSS',
    name: 'Deductions exceed gross',
    category: 'Deductions Components',
    severity: 'blocker',
    confidence: 1.0,
    confidenceLevel: 'VERY_HIGH',
    condition: (ctx) => {
      const ded = ctx.current.total_deductions;
      const gross = ctx.current.gross_pay;
      return ded != null && gross != null && ded > gross;
    },
    explanation: 'Total deductions exceed gross pay',
    userAction: 'Review deduction setup immediately.',
    columnsUsed: ['TotalDeductions', 'GrossPay'],
    minTier: 'starter',
    flagReason: 'Total deductions exceed gross pay, which would result in negative net pay.',
    riskStatement: 'Deductions exceeding gross pay cause negative net pay, which is invalid and blocks payroll processing.',
    commonCauses: [
      'Retroactive deduction applied in full instead of spread over periods',
      'Garnishment or levy exceeds disposable earnings limits',
      'Benefit premiums increased without adjusting deduction caps',
      'Duplicate deduction applied',
    ],
    reviewSteps: [
      'Review all deductions for this employee',
      'Check garnishment limits and disposable earnings',
      'Verify deduction caps are properly configured',
      'Remove or reduce duplicate or excessive deductions',
    ],
    // NEW: 4-Line Golden Template fields
    judgmentCategory: 'Deductions Components Rules',
    triggeredCondition: 'Total deductions exceed gross pay',
    whyThisMatters: 'Deductions exceeding gross pay cause negative net pay, which is invalid, blocks payroll processing, and results in compliance violations.',
    reviewerAction: 'Review all deductions, check garnishment limits against disposable earnings, verify deduction caps are configured, and remove or reduce excessive deductions before approval.',
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
    id: 'NEW_DEDUCTION_INTRODUCED',
    name: 'New deduction introduced',
    category: 'Deductions Components',
    severity: 'review',
    confidence: 0.87,
    confidenceLevel: 'HIGH',
    condition: (ctx) => {
      if (!ctx.baseline || !ctx.current.pay_components || !ctx.baseline.pay_components) return false;
      const baselineTypes = new Set(ctx.baseline.pay_components.map((c: { component_name: string }) => c.component_name));
      return ctx.current.pay_components.some(
        (c: { component_name: string }) => !baselineTypes.has(c.component_name)
      );
    },
    explanation: 'New deduction type appeared',
    userAction: 'Verify new deduction is authorized.',
    columnsUsed: ['DeductionComponents'],
    minTier: 'pro',
    flagReason: 'A deduction type appeared in the current run that was not present in the previous run.',
    riskStatement: 'Unauthorized or unexpected deductions can cause employee complaints and compliance issues.',
    commonCauses: [
      'New benefit enrollment (medical, dental, vision)',
      'Court-ordered garnishment initiated',
      'Employee elected new voluntary deduction',
      'Deduction code added in error',
    ],
    reviewSteps: [
      'Identify the new deduction type',
      'Verify it is authorized by the employee or court order',
      'Confirm the amount is correct',
      'Check the effective date',
    ],
    // NEW: 4-Line Golden Template fields
    judgmentCategory: 'Deductions Components Rules',
    triggeredCondition: 'A deduction type appeared that was not in the previous period',
    whyThisMatters: 'Unauthorized or unexpected deductions can cause employee complaints, disputes, and compliance issues if not properly documented.',
    reviewerAction: 'Identify the new deduction type, verify authorization (employee enrollment or court order), confirm the amount and effective date are correct.',
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
    id: 'DEDUCTION_DROPPED',
    name: 'Deduction dropped unexpectedly',
    category: 'Deductions Components',
    severity: 'review',
    confidence: 0.86,
    confidenceLevel: 'HIGH',
    condition: (ctx) => {
      if (!ctx.baseline || !ctx.current.pay_components || !ctx.baseline.pay_components) return false;
      const currentTypes = new Set(ctx.current.pay_components.map((c: { component_name: string }) => c.component_name));
      return ctx.baseline.pay_components.some(
        (c: { component_name: string }) => !currentTypes.has(c.component_name)
      );
    },
    explanation: 'A deduction from baseline is missing',
    userAction: 'Confirm deduction removal is intentional.',
    columnsUsed: ['DeductionComponents'],
    minTier: 'pro',
    flagReason: 'A deduction present in the previous run is missing from the current run.',
    riskStatement: 'Dropped deductions may indicate canceled benefits, missed garnishments, or system configuration errors.',
    commonCauses: [
      'Employee terminated benefit enrollment',
      'Garnishment completed or satisfied',
      'Deduction code deactivated by mistake',
      'System migration dropped the deduction',
    ],
    reviewSteps: [
      'Identify the missing deduction',
      'Verify if the removal is intentional',
      'If a garnishment, confirm it has been legally satisfied',
      'Restore the deduction if removed in error',
    ],
    // NEW: 4-Line Golden Template fields
    judgmentCategory: 'Deductions Components Rules',
    triggeredCondition: 'A deduction from the previous period is missing',
    whyThisMatters: 'Dropped deductions may indicate canceled benefits, missed garnishments, or system configuration errors that could cause compliance violations.',
    reviewerAction: 'Identify the missing deduction, verify if removal is intentional, confirm garnishments are legally satisfied, and restore if removed in error.',
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
    id: 'DEDUCTION_SPIKE_50PCT',
    name: 'Deduction spike >=50%',
    category: 'Deductions Components',
    severity: 'review',
    confidence: 0.88,
    confidenceLevel: 'HIGH',
    condition: (ctx) => {
      if (ctx.metric !== 'total_deductions' || !ctx.baseline) return false;
      return ctx.deltaPercentage != null && ctx.deltaPercentage >= 50;
    },
    explanation: 'Total deductions spiked >=50%',
    userAction: 'Review deduction changes.',
    columnsUsed: ['TotalDeductions'],
    minTier: 'pro',
    flagReason: 'Total deductions increased by 50% or more compared to the previous period.',
    riskStatement: 'Sudden deduction increases often trigger employee complaints and may indicate configuration errors.',
    commonCauses: [
      'Open enrollment benefit changes took effect',
      'Retroactive deduction catch-up',
      'New garnishment or levy added',
      'Duplicate deduction applied',
    ],
    reviewSteps: [
      'Compare deduction detail between periods',
      'Identify which deduction increased',
      'Verify the increase is authorized',
      'Check for duplicate deductions',
    ],
    // NEW: 4-Line Golden Template fields
    judgmentCategory: 'Deductions Components Rules',
    triggeredCondition: 'Total deductions increased by 50% or more',
    whyThisMatters: 'Sudden deduction increases often trigger employee complaints and may indicate configuration errors, benefit changes, or duplicate deductions.',
    reviewerAction: 'Compare deduction details between periods, identify which deduction increased, verify authorization, and check for duplicate deductions.',
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
    id: 'NEGATIVE_DEDUCTION',
    name: 'Negative deduction',
    category: 'Deductions Components',
    severity: 'blocker',
    confidence: 0.99,
    confidenceLevel: 'VERY_HIGH',
    condition: (ctx) => {
      const ded = ctx.current.total_deductions;
      return ded != null && ded < 0;
    },
    explanation: 'Deduction amount is negative',
    userAction: 'Correct deduction configuration.',
    columnsUsed: ['TotalDeductions'],
    minTier: 'starter',
    flagReason: 'Total deductions is negative, which is not valid in standard payroll.',
    riskStatement: 'Negative deductions inflate net pay and create incorrect tax and benefit records.',
    commonCauses: [
      'Refund or reversal entered as negative deduction',
      'System error in deduction calculation',
      'Manual adjustment with wrong sign',
      'Deduction reversal exceeds original amount',
    ],
    reviewSteps: [
      'Verify the deduction amount is correct',
      'If this is a refund, process it as an earning instead',
      'Correct the sign and re-upload',
    ],
    // NEW: 4-Line Golden Template fields
    judgmentCategory: 'Deductions Components Rules',
    triggeredCondition: 'Total deductions is negative',
    whyThisMatters: 'Negative deductions inflate net pay and create incorrect tax and benefit records, causing compliance violations.',
    reviewerAction: 'Verify the deduction amount is correct, process refunds as earnings instead of negative deductions, and correct the sign before approval.',
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
    id: 'TOTAL_DEDUCTIONS_SUM_MISMATCH',
    name: 'TotalDeductions != sum of components',
    category: 'Deductions Components',
    severity: 'blocker',
    confidence: 0.99,
    confidenceLevel: 'VERY_HIGH',
    condition: (ctx) => {
      const total = ctx.current.total_deductions;
      if (total == null || !ctx.current.pay_components || ctx.current.pay_components.length === 0) return false;
      const sum = ctx.current.pay_components.reduce(
        (acc: number, c: { amount: number }) => acc + (c.amount || 0),
        0
      );
      return Math.abs(total - sum) > 1;
    },
    explanation: 'Total deductions != sum of individual deductions',
    userAction: 'Reconcile deduction components.',
    columnsUsed: ['TotalDeductions', 'DeductionComponents'],
    minTier: 'pro',
    flagReason: 'The total deductions field does not match the sum of individual deduction components.',
    riskStatement: 'Deduction mismatches indicate missing or extra deductions that affect net pay accuracy.',
    commonCauses: [
      'Deduction component not included in the export',
      'Total manually entered without updating components',
      'Rounding differences across deduction types',
      'Imputed income or employer-paid deduction included in total',
    ],
    reviewSteps: [
      'Compare total deductions to the sum of components',
      'Identify the missing or extra amount',
      'Verify all deduction codes are included',
      'Correct the values so they reconcile',
    ],
    // NEW: 4-Line Golden Template fields
    judgmentCategory: 'Deductions Components Rules',
    triggeredCondition: 'Total deductions does not match the sum of individual deduction components',
    whyThisMatters: 'Deduction mismatches indicate missing or extra deductions that will affect net pay accuracy and employee compensation records.',
    reviewerAction: 'Compare total deductions to the sum of components, identify the discrepancy, verify all deduction codes are included, and correct values to reconcile.',
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
    id: '401K_OVER_IRS_LIMIT',
    name: '401(k) over IRS limit',
    category: 'Deductions Components',
    severity: 'blocker',
    confidence: 0.95,
    confidenceLevel: 'VERY_HIGH',
    condition: (ctx) => {
      if (!ctx.current.pay_components) return false;
      const k401 = ctx.current.pay_components.find(
        (c: { component_name: string }) =>
          c.component_name && /401.?k/i.test(c.component_name)
      );
      if (!k401 || k401.amount == null || k401.amount <= 0) return false;
      // Annualize the per-period contribution and compare against the 2025 IRS elective deferral limit ($23,500).
      // The $10,000 single-period threshold previously used only caught extreme outliers and missed
      // the common case of a contribution set too high on a standard pay schedule.
      const IRS_ANNUAL_LIMIT_2025 = 23500;
      const rawFreq = String(ctx.current.pay_frequency ?? '').toLowerCase().replace(/[\s\-_]/g, '');
      let periodsPerYear = 26; // bi-weekly default (conservative — more likely to fire than miss)
      if (rawFreq === 'weekly') periodsPerYear = 52;
      else if (rawFreq === 'monthly') periodsPerYear = 12;
      else if (rawFreq.includes('semimonthly') || rawFreq.includes('semi')) periodsPerYear = 24;
      const annualized = k401.amount * periodsPerYear;
      return annualized > IRS_ANNUAL_LIMIT_2025;
    },
    explanation: 'Annualized 401(k) contribution exceeds IRS elective deferral limit',
    userAction: 'Verify 401(k) deduction amount.',
    columnsUsed: ['DeductionComponents'],
    minTier: 'pro',
    flagReason: 'The per-period 401(k) contribution, when annualized at the current pay frequency, exceeds the IRS 2025 elective deferral limit of $23,500.',
    riskStatement: 'Over-contributing to a 401(k) beyond IRS limits creates an excess deferral that must be corrected by April 15 of the following year, with associated income tax and plan correction obligations.',
    commonCauses: [
      'Contribution percentage set too high for the employee salary level',
      'Annual limit dollar amount entered as a per-period amount',
      'Catch-up contribution for under-50 employees ($31,000 limit applies only to age 50+)',
      'System error in contribution calculation',
    ],
    reviewSteps: [
      'Calculate the annualized contribution: per-period amount × pay periods per year',
      'Compare against the IRS 2025 limit: $23,500 (or $31,000 for age 50+ catch-up)',
      'Check if the percentage vs. dollar amount is properly configured',
      'Reduce the contribution rate and correct before approval',
    ],
    // NEW: 4-Line Golden Template fields
    judgmentCategory: 'Deductions Components Rules',
    triggeredCondition: 'Annualized 401(k) contribution exceeds IRS 2025 elective deferral limit ($23,500)',
    whyThisMatters: 'Excess 401(k) deferrals must be corrected by April 15 of the following year. Failure to correct creates dual income tax liability for the employee and plan compliance issues.',
    reviewerAction: 'Calculate annualized contribution (per-period × periods/year), compare against $23,500 IRS limit, and reduce the contribution rate before approval.',
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
];
