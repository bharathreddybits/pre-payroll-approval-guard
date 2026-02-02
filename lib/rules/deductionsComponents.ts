import { RuleDefinition } from './types';

export const deductionsComponentsRules: RuleDefinition[] = [
  {
    id: 'DEDUCTIONS_EXCEED_GROSS',
    name: 'Deductions exceed gross',
    category: 'Deductions Components',
    severity: 'blocker',
    confidence: 1.0,
    condition: (ctx) => {
      const ded = ctx.current.total_deductions;
      const gross = ctx.current.gross_pay;
      return ded != null && gross != null && ded > gross;
    },
    explanation: 'Total deductions exceed gross pay',
    userAction: 'Review deduction setup immediately.',
    columnsUsed: ['TotalDeductions', 'GrossPay'],
    minTier: 'free',
  },
  {
    id: 'NEW_DEDUCTION_INTRODUCED',
    name: 'New deduction introduced',
    category: 'Deductions Components',
    severity: 'review',
    confidence: 0.87,
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
  },
  {
    id: 'DEDUCTION_DROPPED',
    name: 'Deduction dropped unexpectedly',
    category: 'Deductions Components',
    severity: 'review',
    confidence: 0.86,
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
  },
  {
    id: 'DEDUCTION_SPIKE_50PCT',
    name: 'Deduction spike ≥50%',
    category: 'Deductions Components',
    severity: 'review',
    confidence: 0.88,
    condition: (ctx) => {
      if (ctx.metric !== 'total_deductions' || !ctx.baseline) return false;
      return ctx.deltaPercentage != null && ctx.deltaPercentage >= 50;
    },
    explanation: 'Total deductions spiked ≥50%',
    userAction: 'Review deduction changes.',
    columnsUsed: ['TotalDeductions'],
    minTier: 'pro',
  },
  {
    id: 'NEGATIVE_DEDUCTION',
    name: 'Negative deduction',
    category: 'Deductions Components',
    severity: 'blocker',
    confidence: 0.99,
    condition: (ctx) => {
      const ded = ctx.current.total_deductions;
      return ded != null && ded < 0;
    },
    explanation: 'Deduction amount is negative',
    userAction: 'Correct deduction configuration.',
    columnsUsed: ['TotalDeductions'],
    minTier: 'free',
  },
  {
    id: 'TOTAL_DEDUCTIONS_SUM_MISMATCH',
    name: 'TotalDeductions ≠ sum of components',
    category: 'Deductions Components',
    severity: 'blocker',
    confidence: 0.99,
    condition: (ctx) => {
      const total = ctx.current.total_deductions;
      if (total == null || !ctx.current.pay_components || ctx.current.pay_components.length === 0) return false;
      const sum = ctx.current.pay_components.reduce(
        (acc: number, c: { amount: number }) => acc + (c.amount || 0),
        0
      );
      // Allow $1 tolerance for rounding
      return Math.abs(total - sum) > 1;
    },
    explanation: 'Total deductions ≠ sum of individual deductions',
    userAction: 'Reconcile deduction components.',
    columnsUsed: ['TotalDeductions', 'DeductionComponents'],
    minTier: 'pro',
  },
  {
    id: '401K_OVER_IRS_LIMIT',
    name: '401(k) over IRS limit',
    category: 'Deductions Components',
    severity: 'blocker',
    confidence: 0.95,
    condition: (ctx) => {
      if (!ctx.current.pay_components) return false;
      // 2025 IRS 401(k) elective deferral limit: $23,500
      // Per-period max depends on frequency but flag any single-period contribution > $10,000
      // as almost certainly an error (even monthly max would be ~$1,958)
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
  },
];
