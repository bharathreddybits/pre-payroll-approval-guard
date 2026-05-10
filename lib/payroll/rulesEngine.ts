// lib/payroll/rulesEngine.ts
//
// Applies all judgement rules to the calculated deltas.
//
// IMPORTANT: This is 100% deterministic code.
// - Same input always produces the same output.
// - No randomness, no AI, no external calls.
// - AI explanations are generated AFTER this step, separately.
//
// Rules live in lib/rules/ — each file contains a category of rules.
// To add a new rule, add it to the relevant file in lib/rules/.
// To disable a rule, set its `enabled` flag to false in lib/rules/ruleRegistry.ts.

import { applyDeltaRules, applyEmployeeRules } from '../rules';

export interface JudgementRow {
  delta_id: string;
  is_material: boolean;
  is_blocker: boolean;
  confidence_score: number;
  reasoning: string;
  rule_id: string;
}

export function runRulesEngine(
  insertedDeltas: any[],   // deltas already saved to DB (have delta_id)
  currentEmployees: any[],
  baselineEmployees: any[],
  orgTier: string,
): JudgementRow[] {
  const allJudgements: JudgementRow[] = [];

  const baselineMap = new Map(baselineEmployees.map(e => [e.employee_id, e]));
  const currentMap = new Map(currentEmployees.map(e => [e.employee_id, e]));

  // Group deltas by employee so we can run employee-level rules once per person
  const deltasByEmployee = new Map<string, any[]>();
  for (const delta of insertedDeltas) {
    const list = deltasByEmployee.get(delta.employee_id) ?? [];
    list.push(delta);
    deltasByEmployee.set(delta.employee_id, list);
  }

  for (const [employeeId, empDeltas] of deltasByEmployee) {
    const currentEmp = currentMap.get(employeeId);
    const baselineEmp = baselineMap.get(employeeId) ?? null;

    // Track which rules fired for this employee to prevent duplicates
    const seenRuleIds = new Set<string>();

    // Pick a representative delta for employee-level judgements (prefer net_pay)
    const repDelta = empDeltas.find(d => d.metric === 'net_pay') ?? empDeltas[0];

    // ── Employee-level rules ───────────────────────────────────────────────
    // These fire once per employee regardless of how many metrics changed.
    // Examples: duplicate employee ID, inactive employee receiving pay, new hire.
    const empRecord = currentEmp ?? baselineEmp;
    if (empRecord) {
      const empJudgements = applyEmployeeRules(
        empRecord,
        currentEmp ? baselineEmp : null,
        currentEmployees,
        baselineEmployees,
        orgTier,
      );

      for (const j of empJudgements) {
        if (!seenRuleIds.has(j.rule_id)) {
          seenRuleIds.add(j.rule_id);
          allJudgements.push({
            delta_id: repDelta.delta_id,
            is_material: j.is_material,
            is_blocker: j.is_blocker,
            confidence_score: j.confidence_score,
            reasoning: j.reasoning,
            rule_id: j.rule_id,
          });
        }
      }
    }

    // ── Delta-level rules ─────────────────────────────────────────────────
    // These fire per metric change (e.g. net_pay dropped 40%, tax spiked).
    // new_employee and removed_employee changes are handled by employee-level rules above.
    for (const delta of empDeltas) {
      if (delta.change_type === 'new_employee' || delta.change_type === 'removed_employee') {
        continue;
      }

      if (currentEmp) {
        const deltaJudgements = applyDeltaRules(
          currentEmp,
          baselineEmp,
          delta.metric,
          delta.current_value ?? 0,
          delta.baseline_value,
          currentEmployees,
          baselineEmployees,
          orgTier,
        );

        for (const j of deltaJudgements) {
          if (!seenRuleIds.has(j.rule_id)) {
            seenRuleIds.add(j.rule_id);
            allJudgements.push({
              delta_id: delta.delta_id,
              is_material: j.is_material,
              is_blocker: j.is_blocker,
              confidence_score: j.confidence_score,
              reasoning: j.reasoning,
              rule_id: j.rule_id,
            });
          }
        }
      }
    }
  }

  return allJudgements;
}
