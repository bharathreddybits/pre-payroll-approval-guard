import { RuleDefinition } from './types';

export const hoursComponentsRules: RuleDefinition[] = [
  {
    id: 'ZERO_HOURS_WITH_PAY',
    name: 'Zero hours with pay',
    category: 'Hours Components',
    severity: 'blocker',
    confidence: 1.0,
    condition: (ctx) => {
      const hours = ctx.current.total_hours_worked;
      const gross = ctx.current.gross_pay;
      return hours != null && hours === 0 && gross != null && gross > 0;
    },
    explanation: 'Pay without hours detected',
    userAction: 'Add hours or confirm salaried',
    columnsUsed: ['TotalHoursWorked', 'GrossPay'],
    minTier: 'pro',
  },
  {
    id: 'TOTAL_HOURS_ZERO_ACTIVE',
    name: 'Total hours =0 for active employee',
    category: 'Hours Components',
    severity: 'info',
    confidence: 0.8,
    condition: (ctx) => {
      const hours = ctx.current.total_hours_worked;
      const status = ctx.current.employment_status;
      return hours != null && hours === 0 && status != null && status.toLowerCase() === 'active';
    },
    explanation: 'Total hours =0 for active employee.',
    userAction: 'No action if on unpaid leave.',
    columnsUsed: ['TotalHoursWorked', 'Employment_Status'],
    minTier: 'pro',
  },
  {
    id: 'NEGATIVE_HOURS',
    name: 'Negative hours',
    category: 'Hours Components',
    severity: 'blocker',
    confidence: 0.99,
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
  },
  {
    id: 'HOURS_EXCEED_MAX',
    name: 'Hours exceed plausible max',
    category: 'Hours Components',
    severity: 'blocker',
    confidence: 0.96,
    condition: (ctx) => {
      const hours = ctx.current.total_hours_worked;
      return hours != null && hours > 168; // 24 * 7 = 168 hours in a week
    },
    explanation: 'Hours exceed weekly maximum',
    userAction: 'Correct time entry',
    columnsUsed: ['TotalHoursWorked'],
    minTier: 'pro',
  },
  {
    id: 'HOURS_SUM_MISMATCH',
    name: 'TotalHoursWorked != sum of regular/OT/other',
    category: 'Hours Components',
    severity: 'blocker',
    confidence: 0.96,
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
  },
  {
    id: 'MATERIAL_HOURS_INCREASE',
    name: 'Material hours increase',
    category: 'Hours Components',
    severity: 'review',
    confidence: 0.94,
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
  },
  {
    id: 'MATERIAL_HOURS_DECREASE',
    name: 'Material hours decrease',
    category: 'Hours Components',
    severity: 'review',
    confidence: 0.92,
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
  },
  {
    id: 'OVERTIME_WITHOUT_REGULAR',
    name: 'Overtime without regular hours',
    category: 'Hours Components',
    severity: 'review',
    confidence: 0.93,
    condition: (ctx) => {
      const ot = ctx.current.overtime_hours;
      const reg = ctx.current.regular_hours;
      return ot != null && ot > 0 && (reg == null || reg === 0);
    },
    explanation: 'Overtime logged without regular hours',
    userAction: 'Verify OT entry',
    columnsUsed: ['RegularHours', 'OvertimeHours'],
    minTier: 'pro',
  },
  {
    id: 'PAID_HOURS_EXCEED_TOTAL',
    name: 'Paid hours exceed total',
    category: 'Hours Components',
    severity: 'blocker',
    confidence: 0.98,
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
  },
  {
    id: 'PTO_SPIKE',
    name: 'PTO spike',
    category: 'Hours Components',
    severity: 'info',
    confidence: 0.85,
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
  },
];
