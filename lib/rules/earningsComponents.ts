import { RuleDefinition } from './types';

export const earningsComponentsRules: RuleDefinition[] = [
  {
    id: 'BASE_EARNINGS_DROPPED_20PCT',
    name: 'Base earnings dropped >=20%',
    category: 'Earnings Components',
    severity: 'review',
    confidence: 0.92,
    confidenceLevel: 'HIGH',
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
    flagReason: 'Base earnings decreased by 20% or more compared to the previous period.',
    riskStatement: 'Significant base pay reductions may indicate missing hours, rate changes, or data errors.',
    commonCauses: [
      'Pay rate reduction or demotion',
      'Reduced hours or schedule change',
      'Incorrect rate applied for the period',
      'Partial period pay (start/end mid-period)',
    ],
    reviewSteps: [
      'Verify the employee pay rate is correct',
      'Check if hours worked decreased this period',
      'Confirm any authorized salary changes',
      'Review for partial period adjustments',
    ],
  },
  {
    id: 'BASE_EARNINGS_SPIKE_50PCT',
    name: 'Base earnings spike >=50%',
    category: 'Earnings Components',
    severity: 'review',
    confidence: 0.93,
    confidenceLevel: 'HIGH',
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
    flagReason: 'Base earnings increased by 50% or more compared to the previous period.',
    riskStatement: 'Large base pay increases may indicate unauthorized rate changes or data entry errors.',
    commonCauses: [
      'Promotion or significant raise',
      'Prior period had reduced hours',
      'Retroactive pay adjustment included',
      'Incorrect rate or hours entered',
    ],
    reviewSteps: [
      'Verify the pay rate change is authorized',
      'Check if retroactive adjustments are included',
      'Compare hours worked between periods',
      'Confirm with HR if this is a valid compensation change',
    ],
  },
  {
    id: 'OVERTIME_PAY_WITHOUT_OT_HOURS',
    name: 'Overtime pay without OT hours',
    category: 'Earnings Components',
    severity: 'blocker',
    confidence: 0.97,
    confidenceLevel: 'VERY_HIGH',
    condition: (ctx) => {
      const otPay = ctx.current.overtime_pay;
      const otHours = ctx.current.overtime_hours;
      return otPay != null && otPay > 0 && (otHours == null || otHours === 0);
    },
    explanation: 'OT pay without OT hours',
    userAction: 'Fix OT setup',
    columnsUsed: ['OvertimePay', 'OvertimeHours'],
    minTier: 'pro',
    flagReason: 'Overtime pay is recorded but no overtime hours are logged.',
    riskStatement: 'Overtime pay without corresponding hours is a common audit finding and may violate FLSA requirements.',
    commonCauses: [
      'Overtime hours field not mapped from source system',
      'Flat overtime payment entered without hours',
      'Hours classified under regular instead of overtime',
      'System import error',
    ],
    reviewSteps: [
      'Verify if overtime hours should be recorded',
      'Check the source system for correct OT hours',
      'Ensure hours and pay fields are properly mapped',
      'Correct the hours or reclassify the pay',
    ],
  },
  {
    id: 'BONUS_PAID_UNEXPECTEDLY',
    name: 'Bonus paid unexpectedly',
    category: 'Earnings Components',
    severity: 'review',
    confidence: 0.88,
    confidenceLevel: 'HIGH',
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
    flagReason: 'A bonus payment appeared this period that was not present in the previous period.',
    riskStatement: 'Unverified bonus payments may be unauthorized, duplicated, or entered in error.',
    commonCauses: [
      'Approved performance or signing bonus',
      'Referral bonus payout',
      'Bonus entered for wrong employee',
      'Duplicate bonus from previous cycle',
    ],
    reviewSteps: [
      'Verify the bonus is authorized and documented',
      'Confirm the correct employee received it',
      'Check that it was not already paid in a prior period',
      'Validate the bonus amount',
    ],
  },
  {
    id: 'OTHER_EARNINGS_HIGH',
    name: 'Other earnings unusually high',
    category: 'Earnings Components',
    severity: 'review',
    confidence: 0.86,
    confidenceLevel: 'HIGH',
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
    flagReason: 'Other earnings are significantly higher than the previous period or exceed $1,000.',
    riskStatement: 'Unusual other earnings may indicate miscoded payments, duplicate entries, or unauthorized additions.',
    commonCauses: [
      'Commissions or reimbursements paid this period',
      'Retroactive adjustment included',
      'Payment miscoded to other earnings',
      'Duplicate or unauthorized payment',
    ],
    reviewSteps: [
      'Identify the earning codes making up other earnings',
      'Verify each earning is authorized',
      'Check for duplicate entries',
      'Confirm proper coding of the earnings',
    ],
  },
  {
    id: 'EARNINGS_NEGATIVE',
    name: 'Earnings negative',
    category: 'Earnings Components',
    severity: 'blocker',
    confidence: 1.0,
    confidenceLevel: 'VERY_HIGH',
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
    flagReason: 'One or more earnings fields contain negative values.',
    riskStatement: 'Negative earnings are invalid in standard payroll and indicate data entry or system errors.',
    commonCauses: [
      'Retroactive adjustment entered with wrong sign',
      'Overpayment recovery entered as negative earning instead of deduction',
      'System calculation error',
      'Manual entry error',
    ],
    reviewSteps: [
      'Identify which earnings field is negative',
      'Determine if this should be a deduction instead',
      'Correct the value or reclassify the entry',
      'Re-upload the corrected file',
    ],
  },
  {
    id: 'EARNINGS_WITHOUT_EMPLOYEE',
    name: 'Earnings without employee mapping',
    category: 'Earnings Components',
    severity: 'blocker',
    confidence: 0.99,
    confidenceLevel: 'VERY_HIGH',
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
    flagReason: 'Earnings exist for a record without an employee ID.',
    riskStatement: 'Unassigned earnings cannot be paid, taxed, or reported correctly.',
    commonCauses: [
      'Employee ID column missing from export',
      'Row added manually without an ID',
      'Data mapping error during import',
    ],
    reviewSteps: [
      'Identify the record with missing employee ID',
      'Assign the correct employee ID',
      'Re-upload the corrected file',
    ],
  },
];
