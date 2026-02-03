import { RuleDefinition } from './types';

export const fundamentalPayRules: RuleDefinition[] = [
  {
    id: 'NEGATIVE_GROSS_PAY',
    name: 'Negative gross pay',
    category: 'Fundamental Pay Components',
    severity: 'blocker',
    confidence: 0.97,
    condition: (ctx) => {
      const gross = ctx.current.gross_pay;
      return gross != null && gross < 0;
    },
    explanation: 'Negative gross pay.',
    userAction: 'Correct earnings sum.',
    columnsUsed: ['GrossPay'],
    minTier: 'starter',
  },
  {
    id: 'NET_PAY_NEGATIVE',
    name: 'Net pay negative',
    category: 'Fundamental Pay Components',
    severity: 'blocker',
    confidence: 1.0,
    condition: (ctx) => {
      const net = ctx.current.net_pay;
      return net != null && net < 0;
    },
    explanation: 'Net pay cannot be negative',
    userAction: 'Fix taxes/deductions',
    columnsUsed: ['NetPay'],
    minTier: 'starter',
  },
  {
    id: 'NET_PAY_UNUSUALLY_LOW',
    name: 'Net pay unusually low',
    category: 'Fundamental Pay Components',
    severity: 'review',
    confidence: 0.89,
    condition: (ctx) => {
      const net = ctx.current.net_pay;
      const gross = ctx.current.gross_pay;
      return net != null && gross != null && gross > 0 && net < gross * 0.4;
    },
    explanation: 'Net pay unusually low',
    userAction: 'Review deductions',
    columnsUsed: ['NetPay', 'GrossPay'],
    minTier: 'pro',
  },
  {
    id: 'GROSS_LESS_THAN_NET',
    name: 'GrossPay < NetPay',
    category: 'Fundamental Pay Components',
    severity: 'review',
    confidence: 0.89,
    condition: (ctx) => {
      const gross = ctx.current.gross_pay;
      const net = ctx.current.net_pay;
      return gross != null && net != null && gross < net;
    },
    explanation: 'GrossPay < NetPay',
    userAction: 'Fix calculation error.',
    columnsUsed: ['GrossPay', 'NetPay'],
    minTier: 'starter',
  },
  {
    id: 'NET_PAY_SPIKE_50PCT',
    name: 'Net pay spike ≥50%',
    category: 'Fundamental Pay Components',
    severity: 'review',
    confidence: 0.89,
    condition: (ctx) => {
      if (ctx.metric !== 'net_pay') return false;
      return ctx.deltaPercentage != null && ctx.deltaPercentage >= 50;
    },
    explanation: 'Net ↑ >50%.',
    userAction: 'Check underwithholding.',
    columnsUsed: ['NetPay'],
    minTier: 'starter',
  },
  {
    id: 'NET_PAY_DROP_20PCT',
    name: 'Net pay ↓ ≥20%',
    category: 'Fundamental Pay Components',
    severity: 'review', // Per new Judgements catalog — Review, not Blocker
    confidence: 0.89,
    condition: (ctx) => {
      if (ctx.metric !== 'net_pay') return false;
      return ctx.deltaPercentage != null && ctx.deltaPercentage <= -20;
    },
    explanation: 'Net pay ↓ ≥20%.',
    userAction: 'Verify tax/deduction changes.',
    columnsUsed: ['NetPay'],
    minTier: 'starter',
  },
  {
    id: 'GROSS_NOT_EQUAL_EARNINGS_SUM',
    name: 'Gross ≠ earnings sum',
    category: 'Fundamental Pay Components',
    severity: 'blocker',
    confidence: 0.97,
    condition: (ctx) => {
      const gross = ctx.current.gross_pay;
      const base = ctx.current.base_earnings ?? 0;
      const ot = ctx.current.overtime_pay ?? 0;
      const bonus = ctx.current.bonus_earnings ?? 0;
      const other = ctx.current.other_earnings ?? 0;
      if (gross == null) return false;
      // Only check if at least one earnings component exists
      if (base === 0 && ot === 0 && bonus === 0 && other === 0) return false;
      const sum = base + ot + bonus + other;
      return Math.abs(gross - sum) > 0.01;
    },
    explanation: 'Gross does not match earnings',
    userAction: 'Fix calculation',
    columnsUsed: ['GrossPay', 'Base_Earnings', 'OvertimePay', 'Bonus_Earnings', 'Other_Earnings'],
    minTier: 'pro',
  },
  {
    id: 'GROSS_PAY_SPIKE_50PCT',
    name: 'Gross pay spike ≥50%',
    category: 'Fundamental Pay Components',
    severity: 'review',
    confidence: 0.93,
    condition: (ctx) => {
      if (ctx.metric !== 'gross_pay') return false;
      return ctx.deltaPercentage != null && ctx.deltaPercentage >= 50;
    },
    explanation: 'Gross pay spike detected',
    userAction: 'Review earnings',
    columnsUsed: ['GrossPay'],
    minTier: 'starter',
  },
  {
    id: 'GROSS_PAY_DROP_30PCT',
    name: 'Gross pay drop ≥30%',
    category: 'Fundamental Pay Components',
    severity: 'review',
    confidence: 0.91,
    condition: (ctx) => {
      if (ctx.metric !== 'gross_pay') return false;
      return ctx.deltaPercentage != null && ctx.deltaPercentage <= -30;
    },
    explanation: 'Gross pay dropped significantly',
    userAction: 'Confirm changes',
    columnsUsed: ['GrossPay'],
    minTier: 'starter',
  },
];
