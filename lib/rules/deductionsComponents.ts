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
      if (!k401) return false;
      return k401.amount != null && k401.amount > 10000;
    },
    explanation: '401(k) contribution exceeds plausible per-period max',
    userAction: 'Verify 401(k) deduction amount.',
    columnsUsed: ['DeductionComponents'],
    minTier: 'pro',
    flagReason: '401(k) contribution exceeds $10,000 for a single pay period, well above the plausible per-period maximum.',
    riskStatement: 'Excessive 401(k) contributions violate IRS limits and create compliance and correction obligations.',
    commonCauses: [
      'Percentage entered instead of dollar amount',
      'Annual limit amount entered for a single period',
      'Catch-up contribution calculated incorrectly',
      'System error in contribution calculation',
    ],
    reviewSteps: [
      'Verify the 401(k) contribution amount is correct',
      'Check if the percentage vs. dollar amount is properly configured',
      'Compare against the IRS annual limit ($23,500 for 2025)',
      'Correct the contribution amount',
    ],
  },
];
