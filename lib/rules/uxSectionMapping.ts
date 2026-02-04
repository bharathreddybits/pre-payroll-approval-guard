/** UX section identifiers matching the Rewritten_UX.pdf spec */
export type UxSection =
  | 'blockers'
  | 'high_risk'
  | 'compliance'
  | 'volatility'
  | 'systemic'
  | 'noise';

/**
 * Maps every rule_id to its UX section.
 *
 * At runtime, `is_blocker=true` from the DB always overrides to 'blockers'.
 * This mapping is the fallback for non-blocker presentation.
 * Unknown rule IDs default to 'noise'.
 */
export const RULE_UX_SECTION: Record<string, UxSection> = {
  // === BLOCKERS (severity='blocker' rules) ===
  INACTIVE_EMPLOYEE_PAID: 'blockers',
  MISSING_EMPLOYEE_ID: 'blockers',
  DUPLICATE_EMPLOYEE_ROWS: 'blockers',
  PAY_PERIOD_START_AFTER_END: 'blockers',
  PAY_PERIOD_MISMATCH: 'blockers',
  ZERO_HOURS_WITH_PAY: 'blockers',
  NEGATIVE_HOURS: 'blockers',
  HOURS_EXCEED_MAX: 'blockers',
  HOURS_SUM_MISMATCH: 'blockers',
  PAID_HOURS_EXCEED_TOTAL: 'blockers',
  OVERTIME_PAY_WITHOUT_OT_HOURS: 'blockers',
  EARNINGS_NEGATIVE: 'blockers',
  EARNINGS_WITHOUT_EMPLOYEE: 'blockers',
  NEGATIVE_GROSS_PAY: 'blockers',
  NET_PAY_NEGATIVE: 'blockers',
  GROSS_NOT_EQUAL_EARNINGS_SUM: 'blockers',
  NEGATIVE_TAXES: 'blockers',
  DEDUCTIONS_EXCEED_GROSS: 'blockers',
  NEGATIVE_DEDUCTION: 'blockers',
  TOTAL_DEDUCTIONS_SUM_MISMATCH: 'blockers',
  GROSS_MINUS_TAXES_DEDUCTIONS_NE_NET: 'blockers',

  // === HIGH-RISK REVIEWS ===
  EMPLOYMENT_STATUS_CHANGE: 'high_risk',
  OVERTIME_WITHOUT_REGULAR: 'high_risk',
  BONUS_PAID_UNEXPECTEDLY: 'high_risk',
  NET_PAY_UNUSUALLY_LOW: 'high_risk',
  MISSING_BASELINE_ROW: 'high_risk',
  GROSS_LESS_THAN_NET: 'high_risk',
  OTHER_EARNINGS_HIGH: 'high_risk',

  // === DEDUCTION & COMPLIANCE CHECKS ===
  MISSING_FEDERAL_TAX: 'compliance',
  MISSING_FICA_TAXES: 'compliance',
  STATE_TAX_MISSING: 'compliance',
  NEW_DEDUCTION_INTRODUCED: 'compliance',
  DEDUCTION_DROPPED: 'compliance',
  '401K_OVER_IRS_LIMIT': 'compliance',

  // === COMPONENT VOLATILITY ===
  NET_PAY_SPIKE_50PCT: 'volatility',
  NET_PAY_DROP_20PCT: 'volatility',
  GROSS_PAY_SPIKE_50PCT: 'volatility',
  GROSS_PAY_DROP_30PCT: 'volatility',
  BASE_EARNINGS_DROPPED_20PCT: 'volatility',
  BASE_EARNINGS_SPIKE_50PCT: 'volatility',
  MATERIAL_HOURS_INCREASE: 'volatility',
  MATERIAL_HOURS_DECREASE: 'volatility',
  TAX_SPIKE_40PCT: 'volatility',
  TAX_DROP_30PCT: 'volatility',
  DEDUCTION_SPIKE_50PCT: 'volatility',

  // === SYSTEMIC SIGNALS ===
  PAY_FREQUENCY_CHANGED: 'systemic',
  PAY_GROUP_CHANGED: 'systemic',

  // === NOISE SUPPRESSION ===
  DEPARTMENT_MISSING: 'noise',
  MISSING_PAY_FREQUENCY: 'noise',
  PAY_DATE_IN_PAST: 'noise',
  TOTAL_HOURS_ZERO_ACTIVE: 'noise',
  PTO_SPIKE: 'noise',
  LOCAL_TAX_INCONSISTENCY: 'noise',
  EMPLOYEE_MISSING_IN_CURRENT: 'noise',
};

/** Display metadata for each UX section */
export const UX_SECTION_META: Record<UxSection, {
  title: string;
  description: string;
  order: number;
  defaultExpanded: boolean;
  colorClass: string;
  borderClass: string;
  bgClass: string;
  iconName: string;
}> = {
  blockers: {
    title: 'Blockers',
    description: 'Non-negotiable issues that must be fixed before approval',
    order: 1,
    defaultExpanded: true,
    colorClass: 'text-red-600',
    borderClass: 'border-red-500',
    bgClass: 'bg-red-50',
    iconName: 'ShieldX',
  },
  high_risk: {
    title: 'High-Risk Reviews',
    description: 'Material risks requiring human judgment before proceeding',
    order: 2,
    defaultExpanded: true,
    colorClass: 'text-orange-600',
    borderClass: 'border-orange-500',
    bgClass: 'bg-orange-50',
    iconName: 'AlertTriangle',
  },
  compliance: {
    title: 'Deduction & Compliance Checks',
    description: 'Tax and deduction anomalies that risk employee complaints or regulatory issues',
    order: 3,
    defaultExpanded: true,
    colorClass: 'text-yellow-600',
    borderClass: 'border-yellow-500',
    bgClass: 'bg-yellow-50',
    iconName: 'FileCheck',
  },
  volatility: {
    title: 'Component Volatility',
    description: 'Period-over-period swings in specific pay components',
    order: 4,
    defaultExpanded: false,
    colorClass: 'text-blue-600',
    borderClass: 'border-blue-500',
    bgClass: 'bg-blue-50',
    iconName: 'TrendingUp',
  },
  systemic: {
    title: 'Systemic Signals',
    description: 'Aggregate warnings about payroll configuration changes',
    order: 5,
    defaultExpanded: false,
    colorClass: 'text-purple-600',
    borderClass: 'border-purple-500',
    bgClass: 'bg-purple-50',
    iconName: 'Settings',
  },
  noise: {
    title: 'Noise Suppression',
    description: 'Minor changes suppressed to reduce review fatigue',
    order: 6,
    defaultExpanded: false,
    colorClass: 'text-gray-500',
    borderClass: 'border-gray-300',
    bgClass: 'bg-gray-50',
    iconName: 'VolumeX',
  },
};

/**
 * Determine the UX section for a judgement.
 * is_blocker from the DB always wins (safety-first).
 */
export function getUxSection(ruleId: string, isBlocker: boolean): UxSection {
  if (isBlocker) return 'blockers';
  return RULE_UX_SECTION[ruleId] ?? 'noise';
}
