import { RuleDefinition } from './types';

export const fundamentalPayRules: RuleDefinition[] = [
  {
    id: 'NEGATIVE_GROSS_PAY',
    name: 'Negative gross pay',
    category: 'Fundamental Pay Components',
    severity: 'blocker',
    confidence: 0.97,
    confidenceLevel: 'VERY_HIGH',
    condition: (ctx) => {
      const gross = ctx.current.gross_pay;
      return gross != null && gross < 0;
    },
    explanation: 'Negative gross pay.',
    userAction: 'Correct earnings sum.',
    columnsUsed: ['GrossPay'],
    minTier: 'starter',
    flagReason: 'Gross pay is negative, which is not valid in US payroll processing.',
    riskStatement: 'Negative gross pay indicates a fundamental calculation error that will cascade through taxes, deductions, and net pay.',
    commonCauses: [
      'Retroactive adjustment exceeds current gross',
      'Overpayment recovery exceeds current earnings',
      'Earnings entered with wrong sign',
      'System calculation error',
    ],
    reviewSteps: [
      'Review the earnings breakdown for this employee',
      'Identify any retroactive adjustments or corrections',
      'Verify earnings components sum correctly',
      'Correct the values and re-upload',
    ],
  },
  {
    id: 'NET_PAY_NEGATIVE',
    name: 'Negative Net Pay',
    category: 'Fundamental Pay Components',
    severity: 'blocker',
    confidence: 1.0,
    confidenceLevel: 'VERY_HIGH',
    condition: (ctx) => {
      const net = ctx.current.net_pay;
      return net != null && net < 0;
    },
    explanation: 'Net pay cannot be negative',
    userAction: 'Fix taxes/deductions',
    columnsUsed: ['NetPay'],
    minTier: 'starter',
    flagReason: 'Negative net pay is not permitted in US payroll processing.',
    riskStatement: 'This can result in incorrect employee compensation, compliance violations, and failed payroll submission.',
    commonCauses: [
      'Garnishment exceeds allowable limits',
      'Retroactive deduction applied more than once',
      'Manual adjustment entered as deduction instead of earning',
      'Deduction caps not enforced',
    ],
    reviewSteps: [
      'Review garnishment limits for this employee',
      'Verify recent retroactive adjustments',
      'Check manual earnings and deduction entries',
      'Confirm deduction caps and priorities',
    ],
  },
  {
    id: 'NET_PAY_UNUSUALLY_LOW',
    name: 'Net pay unusually low',
    category: 'Fundamental Pay Components',
    severity: 'review',
    confidence: 0.89,
    confidenceLevel: 'HIGH',
    condition: (ctx) => {
      const net = ctx.current.net_pay;
      const gross = ctx.current.gross_pay;
      return net != null && gross != null && gross > 0 && net < gross * 0.4;
    },
    explanation: 'Net pay unusually low',
    userAction: 'Review deductions',
    columnsUsed: ['NetPay', 'GrossPay'],
    minTier: 'pro',
    flagReason: 'Net pay is less than 40% of gross pay, which is unusually low.',
    riskStatement: 'Very low net-to-gross ratios often indicate excessive deductions or incorrect tax withholding.',
    commonCauses: [
      'New benefit enrollment with high premiums',
      'Additional tax withholding (W-4 change)',
      'Garnishment or levy applied',
      'Duplicate deduction applied',
    ],
    reviewSteps: [
      'Review all deductions for this employee',
      'Check for new or changed benefit elections',
      'Verify tax withholding amounts',
      'Look for duplicate or excessive deductions',
    ],
  },
  {
    id: 'GROSS_LESS_THAN_NET',
    name: 'GrossPay < NetPay',
    category: 'Fundamental Pay Components',
    severity: 'review',
    confidence: 0.89,
    confidenceLevel: 'HIGH',
    condition: (ctx) => {
      const gross = ctx.current.gross_pay;
      const net = ctx.current.net_pay;
      return gross != null && net != null && gross < net;
    },
    explanation: 'GrossPay < NetPay',
    userAction: 'Fix calculation error.',
    columnsUsed: ['GrossPay', 'NetPay'],
    minTier: 'starter',
    flagReason: 'Net pay exceeds gross pay, which should not happen after taxes and deductions.',
    riskStatement: 'This indicates a fundamental math error in the payroll calculation or data entry.',
    commonCauses: [
      'Negative taxes or deductions applied',
      'Reimbursement added to net but not gross',
      'Gross and net columns swapped in the file',
      'Data import mapping error',
    ],
    reviewSteps: [
      'Verify gross and net pay values are in the correct columns',
      'Check for negative tax or deduction values',
      'Ensure reimbursements are properly classified',
      'Correct the calculation and re-upload',
    ],
  },
  {
    id: 'NET_PAY_SPIKE_50PCT',
    name: 'Net pay spike >=50%',
    category: 'Fundamental Pay Components',
    severity: 'review',
    confidence: 0.89,
    confidenceLevel: 'HIGH',
    condition: (ctx) => {
      if (ctx.metric !== 'net_pay') return false;
      return ctx.deltaPercentage != null && ctx.deltaPercentage >= 50;
    },
    explanation: 'Net pay increased by 50% or more.',
    userAction: 'Check for underwithholding or earnings spike.',
    columnsUsed: ['NetPay'],
    minTier: 'starter',
    flagReason: 'Net pay increased by 50% or more compared to the previous period.',
    riskStatement: 'Large net pay increases may indicate underwithholding, duplicate payments, or unauthorized earnings.',
    commonCauses: [
      'Bonus or commission paid this period',
      'Tax withholding decreased significantly',
      'Deduction removed or reduced',
      'Overtime or supplemental pay included',
    ],
    reviewSteps: [
      'Compare earnings between periods',
      'Check for changes in tax withholding',
      'Verify deduction changes',
      'Confirm any bonus or supplemental payments',
    ],
  },
  {
    id: 'NET_PAY_DROP_20PCT',
    name: 'Net pay drop >=20%',
    category: 'Fundamental Pay Components',
    severity: 'review',
    confidence: 0.89,
    confidenceLevel: 'HIGH',
    condition: (ctx) => {
      if (ctx.metric !== 'net_pay') return false;
      return ctx.deltaPercentage != null && ctx.deltaPercentage <= -20;
    },
    explanation: 'Net pay decreased by 20% or more.',
    userAction: 'Verify tax/deduction changes.',
    columnsUsed: ['NetPay'],
    minTier: 'starter',
    flagReason: 'Net pay decreased by 20% or more compared to the previous period.',
    riskStatement: 'Significant net pay drops often trigger employee complaints and may indicate calculation errors.',
    commonCauses: [
      'New benefit enrollment or rate increase',
      'Additional tax withholding',
      'Garnishment or levy initiated',
      'Reduced hours or earnings',
    ],
    reviewSteps: [
      'Identify the source of the decrease (earnings, taxes, or deductions)',
      'Check for new or changed benefit elections',
      'Verify tax withholding changes',
      'Confirm with the employee if needed',
    ],
  },
  {
    id: 'GROSS_NOT_EQUAL_EARNINGS_SUM',
    name: 'Gross != earnings sum',
    category: 'Fundamental Pay Components',
    severity: 'blocker',
    confidence: 0.97,
    confidenceLevel: 'VERY_HIGH',
    condition: (ctx) => {
      const gross = ctx.current.gross_pay;
      const base = ctx.current.base_earnings ?? 0;
      const ot = ctx.current.overtime_pay ?? 0;
      const bonus = ctx.current.bonus_earnings ?? 0;
      const other = ctx.current.other_earnings ?? 0;
      if (gross == null) return false;
      if (base === 0 && ot === 0 && bonus === 0 && other === 0) return false;
      const sum = base + ot + bonus + other;
      return Math.abs(gross - sum) > 0.01;
    },
    explanation: 'Gross does not match earnings',
    userAction: 'Fix calculation',
    columnsUsed: ['GrossPay', 'Base_Earnings', 'OvertimePay', 'Bonus_Earnings', 'Other_Earnings'],
    minTier: 'pro',
    flagReason: 'Gross pay does not equal the sum of earnings components (base + OT + bonus + other).',
    riskStatement: 'Earnings-to-gross mismatches indicate missing or duplicated earnings that affect tax and deduction calculations.',
    commonCauses: [
      'Earnings component not included in the export',
      'Gross manually overridden without updating components',
      'Rounding differences across systems',
      'Additional earning type not categorized',
    ],
    reviewSteps: [
      'Compare gross pay to the sum of all earnings components',
      'Identify the missing or extra amount',
      'Verify all earning codes are mapped to a component',
      'Correct the values so they reconcile',
    ],
  },
  {
    id: 'GROSS_PAY_SPIKE_50PCT',
    name: 'Gross pay spike >=50%',
    category: 'Fundamental Pay Components',
    severity: 'review',
    confidence: 0.93,
    confidenceLevel: 'HIGH',
    condition: (ctx) => {
      if (ctx.metric !== 'gross_pay') return false;
      return ctx.deltaPercentage != null && ctx.deltaPercentage >= 50;
    },
    explanation: 'Gross pay spike detected',
    userAction: 'Review earnings',
    columnsUsed: ['GrossPay'],
    minTier: 'starter',
    flagReason: 'Gross pay increased by 50% or more compared to the previous period.',
    riskStatement: 'Large gross pay spikes may indicate duplicate payments, unauthorized rate changes, or data errors.',
    commonCauses: [
      'Bonus or commission included this period',
      'Significant overtime worked',
      'Retroactive pay adjustment',
      'Rate increase or promotion',
    ],
    reviewSteps: [
      'Review the earnings breakdown for this period',
      'Compare hours and rates between periods',
      'Verify any bonuses or supplemental pay',
      'Confirm the increase is authorized',
    ],
  },
  {
    id: 'GROSS_PAY_DROP_30PCT',
    name: 'Gross pay drop >=30%',
    category: 'Fundamental Pay Components',
    severity: 'review',
    confidence: 0.91,
    confidenceLevel: 'HIGH',
    condition: (ctx) => {
      if (ctx.metric !== 'gross_pay') return false;
      return ctx.deltaPercentage != null && ctx.deltaPercentage <= -30;
    },
    explanation: 'Gross pay dropped significantly',
    userAction: 'Confirm changes',
    columnsUsed: ['GrossPay'],
    minTier: 'starter',
    flagReason: 'Gross pay decreased by 30% or more compared to the previous period.',
    riskStatement: 'Significant gross pay reductions are uncommon and may indicate missing earnings or hours.',
    commonCauses: [
      'Missing hours or earnings for this period',
      'Rate change or demotion',
      'Unpaid leave taken',
      'Partial period pay (hire or termination mid-period)',
    ],
    reviewSteps: [
      'Verify hours worked for this period',
      'Check for rate changes or adjustments',
      'Confirm leave status',
      'Ensure all earnings are included in the file',
    ],
  },
];
