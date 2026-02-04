import { RuleDefinition } from './types';

export const crossCategoryRules: RuleDefinition[] = [
  {
    id: 'GROSS_MINUS_TAXES_DEDUCTIONS_NE_NET',
    name: 'Gross - Taxes - Deductions != Net',
    category: 'Cross-Category',
    severity: 'blocker',
    confidence: 1.0,
    confidenceLevel: 'VERY_HIGH',
    condition: (ctx) => {
      const gross = ctx.current.gross_pay;
      const net = ctx.current.net_pay;
      const ded = ctx.current.total_deductions ?? 0;
      const fedTax = ctx.current.federal_income_tax ?? 0;
      const ssTax = ctx.current.social_security_tax ?? 0;
      const medTax = ctx.current.medicare_tax ?? 0;
      const stateTax = ctx.current.state_income_tax ?? 0;
      const localTax = ctx.current.local_tax ?? 0;

      if (gross == null || net == null) return false;

      const totalTaxes = fedTax + ssTax + medTax + stateTax + localTax;
      const expected = gross - totalTaxes - ded;
      return Math.abs(expected - net) > 2;
    },
    explanation: 'Gross - Taxes - Deductions != Net Pay',
    userAction: 'Reconcile pay components immediately.',
    columnsUsed: ['GrossPay', 'NetPay', 'TotalDeductions', 'FederalIncomeTaxWithheld', 'SocialSecurityWithheld', 'MedicareWithheld', 'StateIncomeTaxWithheld', 'LocalTaxWithheld'],
    minTier: 'starter',
    flagReason: 'The fundamental payroll equation (Gross - Taxes - Deductions = Net) does not balance.',
    riskStatement: 'A broken pay equation means at least one component is incorrect, affecting employee pay, tax filings, and financial reporting.',
    commonCauses: [
      'Tax or deduction component missing from the file',
      'Imputed income not included in gross',
      'Employer-paid benefits included in deductions but not gross',
      'Rounding accumulated across many components',
    ],
    reviewSteps: [
      'Calculate: Gross - All Taxes - All Deductions',
      'Compare the result to Net Pay',
      'Identify the missing or extra amount',
      'Verify all tax and deduction fields are populated',
      'Correct the values and re-upload',
    ],
  },
  {
    id: 'MISSING_BASELINE_ROW',
    name: 'New employee (no baseline)',
    category: 'Cross-Category',
    severity: 'review',
    confidence: 0.9,
    confidenceLevel: 'HIGH',
    condition: (ctx) => {
      if (!ctx.allBaselineEmployees) return false;
      const empId = ctx.current.employee_id;
      if (!empId) return false;
      const inBaseline = ctx.allBaselineEmployees.some(
        (e) => e.employee_id === empId
      );
      return !inBaseline;
    },
    explanation: 'Employee not found in baseline - new hire or data gap',
    userAction: 'Confirm new employee addition.',
    columnsUsed: ['EmployeeID'],
    minTier: 'starter',
    flagReason: 'This employee exists in the current run but not in the baseline (previous) run.',
    riskStatement: 'New employees should be verified to ensure proper onboarding, tax setup, and benefit enrollment.',
    commonCauses: [
      'New hire started this pay period',
      'Employee transferred from another entity',
      'Employee was accidentally excluded from the prior file',
      'Rehire after a gap in employment',
    ],
    reviewSteps: [
      'Confirm this is a valid new hire or transfer',
      'Verify tax setup (W-4, state withholding)',
      'Check benefit enrollment is complete',
      'If not a new hire, investigate why they were missing from baseline',
    ],
  },
  {
    id: 'EMPLOYEE_MISSING_IN_CURRENT',
    name: 'Employee missing in current',
    category: 'Cross-Category',
    severity: 'info',
    confidence: 0.85,
    confidenceLevel: 'MODERATE',
    condition: (ctx) => {
      if (!ctx.allCurrentEmployees) return false;
      const empId = ctx.current.employee_id;
      if (!empId) return false;
      const inCurrent = ctx.allCurrentEmployees.some(
        (e) => e.employee_id === empId
      );
      return !inCurrent;
    },
    explanation: 'Employee in baseline but missing from current payroll',
    userAction: 'FYI - verify if terminated or on leave.',
    columnsUsed: ['EmployeeID'],
    minTier: 'starter',
    flagReason: 'An employee present in the previous run is not in the current run.',
    riskStatement: 'Missing employees may have been terminated, placed on leave, or accidentally excluded.',
    commonCauses: [
      'Employee terminated between pay periods',
      'Employee on unpaid leave',
      'Employee transferred to another entity',
      'Accidentally excluded from the export file',
    ],
    reviewSteps: [
      'Verify the employee status in your HR system',
      'If terminated, confirm final pay was processed',
      'If on leave, ensure proper leave tracking',
      'If excluded accidentally, add them back and re-upload',
    ],
  },
];
