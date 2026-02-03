import { RuleDefinition, RuleContext, Judgement } from './types';
import { employeeIdentityRules } from './employeeIdentity';
import { hoursComponentsRules } from './hoursComponents';
import { earningsComponentsRules } from './earningsComponents';
import { fundamentalPayRules } from './fundamentalPay';
import { taxesComponentsRules } from './taxesComponents';
import { deductionsComponentsRules } from './deductionsComponents';
import { crossCategoryRules } from './crossCategory';

// ---------------------------------------------------------------------------
// All rules, ordered by category
// ---------------------------------------------------------------------------

export const ALL_RULES: RuleDefinition[] = [
  ...employeeIdentityRules,
  ...hoursComponentsRules,
  ...earningsComponentsRules,
  ...fundamentalPayRules,
  ...taxesComponentsRules,
  ...deductionsComponentsRules,
  ...crossCategoryRules,
];

// ---------------------------------------------------------------------------
// Tier-based rule filtering
// ---------------------------------------------------------------------------

const TIER_RANK: Record<string, number> = {
  starter: 0,
  pro: 1,
};

function isRuleAvailable(rule: RuleDefinition, orgTier: string): boolean {
  const ruleRank = TIER_RANK[rule.minTier] ?? 0;
  const tierRank = TIER_RANK[orgTier] ?? 0;
  return tierRank >= ruleRank;
}

// ---------------------------------------------------------------------------
// Apply rules for a single employee context
// ---------------------------------------------------------------------------

/**
 * Evaluate all applicable rules against a single employee context.
 * Returns ALL matching judgements (not first-match-wins).
 *
 * @param ctx - The rule context containing current/baseline employee data, metric info, etc.
 * @param orgTier - Organization tier ('starter', 'pro')
 * @returns Array of Judgement objects for every rule that fired
 */
export function applyRules(ctx: RuleContext, orgTier: string = 'starter'): Judgement[] {
  const judgements: Judgement[] = [];

  for (const rule of ALL_RULES) {
    if (!isRuleAvailable(rule, orgTier)) continue;

    try {
      if (rule.condition(ctx)) {
        judgements.push({
          rule_id: rule.id,
          rule_name: rule.name,
          category: rule.category,
          severity: rule.severity,
          is_material: rule.severity === 'blocker' || rule.severity === 'review',
          is_blocker: rule.severity === 'blocker',
          confidence_score: rule.confidence,
          reasoning: rule.explanation,
          user_action: rule.userAction,
          columns_used: rule.columnsUsed,
        });
      }
    } catch {
      // Rule evaluation failed — skip silently to avoid breaking the entire engine
      console.warn(`Rule ${rule.id} threw during evaluation, skipping.`);
    }
  }

  return judgements;
}

/**
 * Apply delta-based rules for a specific metric change.
 * Used when iterating over numeric field deltas between baseline and current.
 */
export function applyDeltaRules(
  current: Record<string, any>,
  baseline: Record<string, any> | null,
  metric: string,
  currentValue: number,
  baselineValue: number | null,
  allCurrentEmployees?: Record<string, any>[],
  allBaselineEmployees?: Record<string, any>[],
  orgTier: string = 'starter',
): Judgement[] {
  const deltaAbsolute = baselineValue != null ? currentValue - baselineValue : null;
  const deltaPercentage = baselineValue != null && baselineValue !== 0
    ? ((currentValue - baselineValue) / Math.abs(baselineValue)) * 100
    : null;

  const ctx: RuleContext = {
    current,
    baseline: baseline ?? undefined,
    metric,
    currentValue,
    baselineValue: baselineValue ?? undefined,
    deltaAbsolute: deltaAbsolute ?? undefined,
    deltaPercentage: deltaPercentage ?? undefined,
    allCurrentEmployees,
    allBaselineEmployees,
  };

  return applyRules(ctx, orgTier);
}

/**
 * Apply employee-level rules (not delta-based).
 * These check the employee record itself, not a specific metric change.
 * Used for identity checks, cross-checks, and consistency rules.
 */
export function applyEmployeeRules(
  current: Record<string, any>,
  baseline: Record<string, any> | null,
  allCurrentEmployees?: Record<string, any>[],
  allBaselineEmployees?: Record<string, any>[],
  orgTier: string = 'starter',
): Judgement[] {
  const ctx: RuleContext = {
    current,
    baseline: baseline ?? undefined,
    metric: '__employee_level__',
    allCurrentEmployees,
    allBaselineEmployees,
  };

  return applyRules(ctx, orgTier);
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export type { RuleDefinition, RuleContext, Judgement } from './types';
export { employeeIdentityRules } from './employeeIdentity';
export { hoursComponentsRules } from './hoursComponents';
export { earningsComponentsRules } from './earningsComponents';
export { fundamentalPayRules } from './fundamentalPay';
export { taxesComponentsRules } from './taxesComponents';
export { deductionsComponentsRules } from './deductionsComponents';
export { crossCategoryRules } from './crossCategory';
