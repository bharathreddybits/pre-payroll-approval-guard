import { RuleDefinition } from './types';

export const taxesComponentsRules: RuleDefinition[] = [
  {
    id: 'NEGATIVE_TAXES',
    name: 'Negative taxes',
    category: 'Taxes Components',
    severity: 'blocker',
    confidence: 1.0,
    condition: (ctx) => {
      const fields = ['federal_income_tax', 'social_security_tax', 'medicare_tax', 'state_income_tax', 'local_tax'];
      return fields.some(f => {
        const val = ctx.current[f];
        return val != null && val < 0;
      });
    },
    explanation: 'Taxes < 0',
    userAction: 'Correct W-4 or calculation.',
    columnsUsed: ['FederalIncomeTaxWithheld', 'SocialSecurityWithheld', 'MedicareWithheld', 'StateIncomeTaxWithheld', 'LocalTaxWithheld'],
    minTier: 'free',
  },
  {
    id: 'MISSING_FEDERAL_TAX',
    name: 'Missing federal tax',
    category: 'Taxes Components',
    severity: 'blocker',
    confidence: 0.97,
    condition: (ctx) => {
      const fed = ctx.current.federal_income_tax;
      const gross = ctx.current.gross_pay;
      // Only flag if there is meaningful gross pay but no federal tax
      return (fed == null || fed === 0) && gross != null && gross > 500;
    },
    explanation: 'Federal tax missing',
    userAction: 'Verify tax setup',
    columnsUsed: ['FederalIncomeTaxWithheld', 'GrossPay'],
    minTier: 'pro',
  },
  {
    id: 'MISSING_FICA_TAXES',
    name: 'Missing FICA taxes',
    category: 'Taxes Components',
    severity: 'blocker',
    confidence: 0.96,
    condition: (ctx) => {
      const ss = ctx.current.social_security_tax;
      const med = ctx.current.medicare_tax;
      const gross = ctx.current.gross_pay;
      return ((ss == null || ss === 0) || (med == null || med === 0)) && gross != null && gross > 500;
    },
    explanation: 'FICA tax missing',
    userAction: 'Fix tax config',
    columnsUsed: ['SocialSecurityWithheld', 'MedicareWithheld', 'GrossPay'],
    minTier: 'pro',
  },
  {
    id: 'TAX_SPIKE_40PCT',
    name: 'Tax spike ≥40%',
    category: 'Taxes Components',
    severity: 'review',
    confidence: 0.9,
    condition: (ctx) => {
      const taxMetrics = ['federal_income_tax', 'social_security_tax', 'medicare_tax', 'state_income_tax', 'local_tax'];
      if (!taxMetrics.includes(ctx.metric) || !ctx.baseline) return false;
      return ctx.deltaPercentage != null && ctx.deltaPercentage >= 40;
    },
    explanation: 'Tax spike detected',
    userAction: 'Review filing status',
    columnsUsed: ['FederalIncomeTaxWithheld', 'SocialSecurityWithheld', 'MedicareWithheld', 'StateIncomeTaxWithheld', 'LocalTaxWithheld'],
    minTier: 'pro',
  },
  {
    id: 'TAX_DROP_30PCT',
    name: 'Tax drop ≥30%',
    category: 'Taxes Components',
    severity: 'review',
    confidence: 0.89,
    condition: (ctx) => {
      const taxMetrics = ['federal_income_tax', 'social_security_tax', 'medicare_tax', 'state_income_tax', 'local_tax'];
      if (!taxMetrics.includes(ctx.metric) || !ctx.baseline) return false;
      return ctx.deltaPercentage != null && ctx.deltaPercentage <= -30;
    },
    explanation: 'Tax drop detected',
    userAction: 'Confirm exemptions',
    columnsUsed: ['FederalIncomeTaxWithheld', 'SocialSecurityWithheld', 'MedicareWithheld', 'StateIncomeTaxWithheld', 'LocalTaxWithheld'],
    minTier: 'pro',
  },
  {
    id: 'STATE_TAX_MISSING',
    name: 'State tax missing',
    category: 'Taxes Components',
    severity: 'review',
    confidence: 0.88,
    condition: (ctx) => {
      const stateTax = ctx.current.state_income_tax;
      const gross = ctx.current.gross_pay;
      // Flag only if gross is significant and no state tax
      return (stateTax == null || stateTax === 0) && gross != null && gross > 500;
    },
    explanation: 'State tax missing',
    userAction: 'Check state setup',
    columnsUsed: ['StateIncomeTaxWithheld'],
    minTier: 'pro',
  },
  {
    id: 'LOCAL_TAX_INCONSISTENCY',
    name: 'Local tax inconsistency',
    category: 'Taxes Components',
    severity: 'info',
    confidence: 0.82,
    condition: (ctx) => {
      // Flag if local tax is present for only some employees
      // This is a cross-employee check; the engine handles it via allCurrentEmployees
      if (!ctx.allCurrentEmployees) return false;
      const hasLocal = ctx.current.local_tax != null && ctx.current.local_tax > 0;
      if (!hasLocal) return false;
      const totalWithLocal = ctx.allCurrentEmployees.filter(e => e.local_tax != null && e.local_tax > 0).length;
      const total = ctx.allCurrentEmployees.length;
      // Flag if less than 30% of employees have local tax (suggesting inconsistency)
      return total > 5 && totalWithLocal / total < 0.3;
    },
    explanation: 'Local tax inconsistency',
    userAction: 'FYI',
    columnsUsed: ['LocalTaxWithheld'],
    minTier: 'pro',
  },
];
