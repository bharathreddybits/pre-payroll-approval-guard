import { RuleDefinition } from './types';

export const taxesComponentsRules: RuleDefinition[] = [
  {
    id: 'NEGATIVE_TAXES',
    name: 'Negative taxes',
    category: 'Taxes Components',
    severity: 'blocker',
    confidence: 1.0,
    confidenceLevel: 'VERY_HIGH',
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
    minTier: 'starter',
    flagReason: 'One or more tax withholding fields contain negative values.',
    riskStatement: 'Negative tax values are invalid and will cause incorrect filings and potential penalties.',
    commonCauses: [
      'Prior period tax correction entered with wrong sign',
      'System error during tax calculation',
      'Manual adjustment to tax withholding entered incorrectly',
      'Import mapping error (deduction vs. tax)',
    ],
    reviewSteps: [
      'Identify which tax field is negative',
      'Determine the intended adjustment',
      'Correct the value to a non-negative number',
      'Re-upload the corrected file',
    ],
    // NEW: 4-Line Golden Template fields
    judgmentCategory: 'Taxes Components Rules',
    triggeredCondition: 'One or more tax withholding fields contain negative values',
    whyThisMatters: 'Negative tax values are invalid and will cause incorrect tax filings, reporting errors, and potential IRS penalties.',
    reviewerAction: 'Identify which tax field is negative, determine the intended adjustment, correct the value to a non-negative number, and re-upload before approval.',
    uiHints: {
      defaultExpanded: true,
      requiresAcknowledgement: true,
      highlightLevel: 'RED',
    },
    systemLimits: {
      doesNotJudgeAuthorization: true,
      doesNotJudgeLegalCompliance: true,
    },
  },
  {
    id: 'MISSING_FEDERAL_TAX',
    name: 'Missing federal tax',
    category: 'Taxes Components',
    severity: 'blocker',
    confidence: 0.97,
    confidenceLevel: 'VERY_HIGH',
    condition: (ctx) => {
      const fed = ctx.current.federal_income_tax;
      const gross = ctx.current.gross_pay;
      return (fed == null || fed === 0) && gross != null && gross > 500;
    },
    explanation: 'Federal tax missing',
    userAction: 'Verify tax setup',
    columnsUsed: ['FederalIncomeTaxWithheld', 'GrossPay'],
    minTier: 'pro',
    flagReason: 'No federal income tax withheld for an employee with gross pay over $500.',
    riskStatement: 'Missing federal tax withholding may result in IRS penalties for both employer and employee.',
    commonCauses: [
      'Employee claimed exempt on W-4',
      'W-4 not yet submitted for new hire',
      'Tax setup incomplete in payroll system',
      'Tax field not mapped in data export',
    ],
    reviewSteps: [
      'Check the employee W-4 filing status',
      'Verify if the employee is legitimately exempt',
      'Confirm the tax setup in your payroll system',
      'If exempt, document the reason; otherwise fix the withholding',
    ],
    // NEW: 4-Line Golden Template fields
    judgmentCategory: 'Taxes Components Rules',
    triggeredCondition: 'No federal income tax withheld for employee with gross pay over $500',
    whyThisMatters: 'Missing federal tax withholding may result in IRS penalties for both employer and employee, plus year-end tax liabilities.',
    reviewerAction: 'Check the employee W-4 filing status, verify if legitimately exempt, and if not exempt, fix the withholding setup before approval.',
    uiHints: {
      defaultExpanded: true,
      requiresAcknowledgement: true,
      highlightLevel: 'RED',
    },
    systemLimits: {
      doesNotJudgeAuthorization: true,
      doesNotJudgeLegalCompliance: true,
    },
  },
  {
    id: 'MISSING_FICA_TAXES',
    name: 'Missing FICA taxes',
    category: 'Taxes Components',
    severity: 'blocker',
    confidence: 0.96,
    confidenceLevel: 'VERY_HIGH',
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
    flagReason: 'Social Security or Medicare tax is missing for an employee with significant gross pay.',
    riskStatement: 'FICA taxes are mandatory for most employees. Missing FICA creates compliance risk and IRS reporting errors.',
    commonCauses: [
      'Employee incorrectly classified as FICA-exempt',
      'Tax setup not completed for new hire',
      'Student or religious worker exemption not documented',
      'Tax field not mapped in data export',
    ],
    reviewSteps: [
      'Verify if the employee qualifies for FICA exemption',
      'Check the tax configuration in your payroll system',
      'Ensure both SS and Medicare fields are populated',
      'Document any valid exemptions',
    ],
    // NEW: 4-Line Golden Template fields
    judgmentCategory: 'Taxes Components Rules',
    triggeredCondition: 'Social Security or Medicare tax missing for employee with significant gross pay',
    whyThisMatters: 'FICA taxes are mandatory for most employees. Missing FICA creates IRS compliance risk and reporting errors that can result in penalties.',
    reviewerAction: 'Verify if the employee qualifies for FICA exemption, check the tax configuration, ensure both SS and Medicare fields are populated, and document any valid exemptions.',
    uiHints: {
      defaultExpanded: true,
      requiresAcknowledgement: true,
      highlightLevel: 'RED',
    },
    systemLimits: {
      doesNotJudgeAuthorization: true,
      doesNotJudgeLegalCompliance: true,
    },
  },
  {
    id: 'TAX_SPIKE_40PCT',
    name: 'Tax spike >=40%',
    category: 'Taxes Components',
    severity: 'review',
    confidence: 0.9,
    confidenceLevel: 'HIGH',
    condition: (ctx) => {
      const taxMetrics = ['federal_income_tax', 'social_security_tax', 'medicare_tax', 'state_income_tax', 'local_tax'];
      if (!taxMetrics.includes(ctx.metric) || !ctx.baseline) return false;
      return ctx.deltaPercentage != null && ctx.deltaPercentage >= 40;
    },
    explanation: 'Tax spike detected',
    userAction: 'Review filing status',
    columnsUsed: ['FederalIncomeTaxWithheld', 'SocialSecurityWithheld', 'MedicareWithheld', 'StateIncomeTaxWithheld', 'LocalTaxWithheld'],
    minTier: 'pro',
    flagReason: 'Tax withholding increased by 40% or more compared to the previous period.',
    riskStatement: 'Large tax increases may indicate W-4 changes, supplemental pay tax treatment, or calculation errors.',
    commonCauses: [
      'Employee updated W-4 withholding',
      'Supplemental pay taxed at flat rate',
      'Earnings increase pushed into higher bracket',
      'State residency change',
    ],
    reviewSteps: [
      'Check for W-4 or withholding changes',
      'Verify if earnings increased significantly',
      'Confirm the tax calculation method used',
      'Review for supplemental pay tax treatment',
    ],
    // NEW: 4-Line Golden Template fields
    judgmentCategory: 'Taxes Components Rules',
    triggeredCondition: 'Tax withholding increased by 40% or more',
    whyThisMatters: 'Large tax increases may indicate W-4 changes, supplemental pay tax treatment, or calculation errors that could result in over-withholding complaints.',
    reviewerAction: 'Check for W-4 or withholding changes, verify if earnings increased significantly, and confirm the tax calculation method used.',
    uiHints: {
      defaultExpanded: true,
      requiresAcknowledgement: false,
      highlightLevel: 'AMBER',
    },
    systemLimits: {
      doesNotJudgeAuthorization: true,
      doesNotJudgeLegalCompliance: true,
    },
  },
  {
    id: 'TAX_DROP_30PCT',
    name: 'Tax drop >=30%',
    category: 'Taxes Components',
    severity: 'review',
    confidence: 0.89,
    confidenceLevel: 'HIGH',
    condition: (ctx) => {
      const taxMetrics = ['federal_income_tax', 'social_security_tax', 'medicare_tax', 'state_income_tax', 'local_tax'];
      if (!taxMetrics.includes(ctx.metric) || !ctx.baseline) return false;
      return ctx.deltaPercentage != null && ctx.deltaPercentage <= -30;
    },
    explanation: 'Tax drop detected',
    userAction: 'Confirm exemptions',
    columnsUsed: ['FederalIncomeTaxWithheld', 'SocialSecurityWithheld', 'MedicareWithheld', 'StateIncomeTaxWithheld', 'LocalTaxWithheld'],
    minTier: 'pro',
    flagReason: 'Tax withholding decreased by 30% or more compared to the previous period.',
    riskStatement: 'Significant tax decreases may result in underwithholding and year-end tax liabilities for employees.',
    commonCauses: [
      'Employee increased allowances or claimed exempt',
      'Earnings decreased this period',
      'Pre-tax deduction increased (FSA, HSA, 401k)',
      'Tax calculation error',
    ],
    reviewSteps: [
      'Check for W-4 or withholding changes',
      'Verify if earnings decreased',
      'Review pre-tax deduction changes',
      'Confirm the tax calculation is correct',
    ],
    // NEW: 4-Line Golden Template fields
    judgmentCategory: 'Taxes Components Rules',
    triggeredCondition: 'Tax withholding decreased by 30% or more',
    whyThisMatters: 'Significant tax decreases may result in under-withholding and year-end tax liabilities for employees, leading to complaints and potential penalties.',
    reviewerAction: 'Check for W-4 or withholding changes, verify if earnings decreased, review pre-tax deduction changes, and confirm the tax calculation is correct.',
    uiHints: {
      defaultExpanded: true,
      requiresAcknowledgement: false,
      highlightLevel: 'AMBER',
    },
    systemLimits: {
      doesNotJudgeAuthorization: true,
      doesNotJudgeLegalCompliance: true,
    },
  },
  {
    id: 'STATE_TAX_MISSING',
    name: 'State tax missing',
    category: 'Taxes Components',
    severity: 'review',
    confidence: 0.88,
    confidenceLevel: 'HIGH',
    condition: (ctx) => {
      const stateTax = ctx.current.state_income_tax;
      const gross = ctx.current.gross_pay;
      return (stateTax == null || stateTax === 0) && gross != null && gross > 500;
    },
    explanation: 'State tax missing',
    userAction: 'Check state setup',
    columnsUsed: ['StateIncomeTaxWithheld'],
    minTier: 'pro',
    flagReason: 'No state income tax withheld for an employee with significant gross pay.',
    riskStatement: 'Missing state tax may indicate incorrect work state setup or an employee in a no-income-tax state.',
    commonCauses: [
      'Employee works in a state with no income tax',
      'State tax setup not completed',
      'Work state not assigned in payroll system',
      'Remote worker state not updated',
    ],
    reviewSteps: [
      'Verify the employee work state',
      'Check if the state has income tax',
      'If applicable, set up state tax withholding',
      'Document if the employee is in a no-income-tax state',
    ],
    // NEW: 4-Line Golden Template fields
    judgmentCategory: 'Taxes Components Rules',
    triggeredCondition: 'No state income tax withheld for employee with significant gross pay',
    whyThisMatters: 'Missing state tax may indicate incorrect work state setup or could be valid if employee works in a no-income-tax state.',
    reviewerAction: 'Verify the employee work state, check if the state has income tax, and either set up state tax withholding or document if in a no-income-tax state.',
    uiHints: {
      defaultExpanded: true,
      requiresAcknowledgement: false,
      highlightLevel: 'AMBER',
    },
    systemLimits: {
      doesNotJudgeAuthorization: true,
      doesNotJudgeLegalCompliance: true,
    },
  },
  {
    id: 'LOCAL_TAX_INCONSISTENCY',
    name: 'Local tax inconsistency',
    category: 'Taxes Components',
    severity: 'info',
    confidence: 0.82,
    confidenceLevel: 'MODERATE',
    condition: (ctx) => {
      if (!ctx.allCurrentEmployees) return false;
      const hasLocal = ctx.current.local_tax != null && ctx.current.local_tax > 0;
      if (!hasLocal) return false;
      const totalWithLocal = ctx.allCurrentEmployees.filter(e => e.local_tax != null && e.local_tax > 0).length;
      const total = ctx.allCurrentEmployees.length;
      return total > 5 && totalWithLocal / total < 0.3;
    },
    explanation: 'Local tax inconsistency',
    userAction: 'FYI',
    columnsUsed: ['LocalTaxWithheld'],
    minTier: 'pro',
    flagReason: 'Less than 30% of employees have local tax, suggesting inconsistent tax jurisdiction setup.',
    riskStatement: 'Inconsistent local tax setup may cause compliance issues in jurisdictions that require it.',
    commonCauses: [
      'Employees in different jurisdictions with varying local tax requirements',
      'Local tax setup incomplete for some employees',
      'Recent office relocation affecting tax jurisdictions',
    ],
    reviewSteps: [
      'Review local tax jurisdiction assignments',
      'Verify which employees should have local tax withheld',
      'This is informational and does not block approval',
    ],
    // NEW: 4-Line Golden Template fields
    judgmentCategory: 'Taxes Components Rules',
    triggeredCondition: 'Less than 30% of employees have local tax withholding',
    whyThisMatters: 'Inconsistent local tax setup may cause compliance issues in jurisdictions that require it, though this could be normal if employees are in different locations.',
    reviewerAction: 'Review local tax jurisdiction assignments for consistency. This is informational and does not block approval.',
    uiHints: {
      defaultExpanded: false,
      requiresAcknowledgement: false,
      highlightLevel: 'GRAY',
    },
    systemLimits: {
      doesNotJudgeAuthorization: true,
      doesNotJudgeLegalCompliance: true,
    },
  },
];
