import { RuleDefinition } from './types';

export const earningsComponentsRules: RuleDefinition[] = [
  {
    id: 'BASE_EARNINGS_DROPPED_20PCT',
    name: 'Base earnings dropped ≥20%',
    category: 'Earnings Components',
    severity: 'review',
    confidence: 0.92,
    condition: (ctx) => {
      if (ctx.metric !== 'base_earnings' || !ctx.baseline) return false;
      const b = ctx.baseline.base_earnings;
      const c = ctx.current.base_earnings;
      if (b == null || b === 0 || c == null) return false;
      return ((c - b) / Math.abs(b)) * 100 <= -20;
    },
    explanation: 'Base pay reduced significantly',
    userAction: 'Confirm rate/hours',
    columnsUsed: ['Base_Earnings'],
    minTier: 'pro',
  },
  {
    id: 'BASE_EARNINGS_SPIKE_50PCT',
    name: 'Base earnings spike ≥50%',
    category: 'Earnings Components',
    severity: 'review',
    confidence: 0.93,
    condition: (ctx) => {
      if (ctx.metric !== 'base_earnings' || !ctx.baseline) return false;
      const b = ctx.baseline.base_earnings;
      const c = ctx.current.base_earnings;
      if (b == null || b === 0 || c == null) return false;
      return ((c - b) / Math.abs(b)) * 100 >= 50;
    },
    explanation: 'Base pay spike detected',
    userAction: 'Verify comp change',
    columnsUsed: ['Base_Earnings'],
    minTier: 'pro',
  },
  {
    id: 'OVERTIME_PAY_WITHOUT_OT_HOURS',
    name: 'Overtime pay without OT hours',
    category: 'Earnings Components',
    severity: 'blocker',
    confidence: 0.97,
    condition: (ctx) => {
      const otPay = ctx.current.overtime_pay;
      const otHours = ctx.current.overtime_hours;
      return otPay != null && otPay > 0 && (otHours == null || otHours === 0);
    },
    explanation: 'OT pay without OT hours',
    userAction: 'Fix OT setup',
    columnsUsed: ['OvertimePay', 'OvertimeHours'],
    minTier: 'pro',
  },
  {
    id: 'BONUS_PAID_UNEXPECTEDLY',
    name: 'Bonus paid unexpectedly',
    category: 'Earnings Components',
    severity: 'review',
    confidence: 0.88,
    condition: (ctx) => {
      if (!ctx.baseline) return false;
      const bBonus = ctx.baseline.bonus_earnings;
      const cBonus = ctx.current.bonus_earnings;
      return (bBonus == null || bBonus === 0) && cBonus != null && cBonus > 0;
    },
    explanation: 'Bonus introduced this run',
    userAction: 'Confirm approval',
    columnsUsed: ['Bonus_Earnings'],
    minTier: 'pro',
  },
  {
    id: 'OTHER_EARNINGS_HIGH',
    name: 'Other earnings unusually high',
    category: 'Earnings Components',
    severity: 'review',
    confidence: 0.86,
    condition: (ctx) => {
      if (!ctx.baseline) return false;
      const bOther = ctx.baseline.other_earnings;
      const cOther = ctx.current.other_earnings;
      if (bOther == null || bOther === 0) return cOther != null && cOther > 1000;
      return cOther != null && cOther >= bOther * 2;
    },
    explanation: 'Other earnings unusually high',
    userAction: 'Review earning code',
    columnsUsed: ['Other_Earnings'],
    minTier: 'pro',
  },
  {
    id: 'EARNINGS_NEGATIVE',
    name: 'Earnings negative',
    category: 'Earnings Components',
    severity: 'blocker',
    confidence: 1.0,
    condition: (ctx) => {
      const fields = ['base_earnings', 'overtime_pay', 'bonus_earnings', 'other_earnings'];
      return fields.some(f => {
        const val = ctx.current[f];
        return val != null && val < 0;
      });
    },
    explanation: 'Negative earnings invalid',
    userAction: 'Correct values',
    columnsUsed: ['Base_Earnings', 'OvertimePay', 'Bonus_Earnings', 'Other_Earnings'],
    minTier: 'starter',
  },
  {
    id: 'EARNINGS_WITHOUT_EMPLOYEE',
    name: 'Earnings without employee mapping',
    category: 'Earnings Components',
    severity: 'blocker',
    confidence: 0.99,
    condition: (ctx) => {
      const empId = ctx.current.employee_id;
      const hasEarnings = ['base_earnings', 'overtime_pay', 'bonus_earnings', 'other_earnings'].some(f => {
        const val = ctx.current[f];
        return val != null && val > 0;
      });
      return hasEarnings && (empId == null || String(empId).trim() === '');
    },
    explanation: 'Earnings without employee mapping',
    userAction: 'Fix employee data',
    columnsUsed: ['EmployeeID', 'Base_Earnings'],
    minTier: 'pro',
  },
];
