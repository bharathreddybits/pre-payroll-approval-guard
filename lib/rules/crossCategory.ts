import { RuleDefinition } from './types';

export const crossCategoryRules: RuleDefinition[] = [
  {
    id: 'GROSS_MINUS_TAXES_DEDUCTIONS_NE_NET',
    name: 'Gross − Taxes − Deductions ≠ Net',
    category: 'Cross-Category',
    severity: 'blocker',
    confidence: 1.0,
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
      // Allow $2 tolerance for rounding across multiple components
      return Math.abs(expected - net) > 2;
    },
    explanation: 'Gross − Taxes − Deductions ≠ Net Pay',
    userAction: 'Reconcile pay components immediately.',
    columnsUsed: ['GrossPay', 'NetPay', 'TotalDeductions', 'FederalIncomeTaxWithheld', 'SocialSecurityWithheld', 'MedicareWithheld', 'StateIncomeTaxWithheld', 'LocalTaxWithheld'],
    minTier: 'free',
  },
  {
    id: 'MISSING_BASELINE_ROW',
    name: 'New employee (no baseline)',
    category: 'Cross-Category',
    severity: 'review',
    confidence: 0.9,
    condition: (ctx) => {
      // Employee exists in current but not in baseline
      if (!ctx.allBaselineEmployees) return false;
      const empId = ctx.current.employee_id;
      if (!empId) return false;
      const inBaseline = ctx.allBaselineEmployees.some(
        (e) => e.employee_id === empId
      );
      return !inBaseline;
    },
    explanation: 'Employee not found in baseline — new hire or data gap',
    userAction: 'Confirm new employee addition.',
    columnsUsed: ['EmployeeID'],
    minTier: 'free',
  },
  {
    id: 'EMPLOYEE_MISSING_IN_CURRENT',
    name: 'Employee missing in current',
    category: 'Cross-Category',
    severity: 'info',
    confidence: 0.85,
    condition: (ctx) => {
      // This rule runs from the baseline perspective — employee in baseline but not in current
      // The engine handles this by iterating baseline employees and checking current
      if (!ctx.allCurrentEmployees) return false;
      const empId = ctx.current.employee_id;
      if (!empId) return false;
      const inCurrent = ctx.allCurrentEmployees.some(
        (e) => e.employee_id === empId
      );
      return !inCurrent;
    },
    explanation: 'Employee in baseline but missing from current payroll',
    userAction: 'FYI — verify if terminated or on leave.',
    columnsUsed: ['EmployeeID'],
    minTier: 'free',
  },
];
