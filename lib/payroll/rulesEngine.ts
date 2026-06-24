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

export interface EmployeePayRecord {
  employee_id: string;
  employee_name: string | null;
  department: string | null;
  employment_status: string | null;
  gross_pay: number;
  net_pay: number;
  total_deductions: number;
  regular_hours?: number | null;
  overtime_hours?: number | null;
  base_earnings?: number | null;
  overtime_pay?: number | null;
  bonus_earnings?: number | null;
  federal_income_tax?: number | null;
  state_income_tax?: number | null;
  metadata?: Record<string, unknown>;
}

export interface DeltaRecord {
  delta_id: string;
  employee_id: string;
  metric: string;
  component_name: string | null;
  baseline_value: number | null;
  current_value: number | null;
  delta_absolute: number | null;
  delta_percentage: number | null;
  change_type: string;
}

export function runRulesEngine(
  insertedDeltas: DeltaRecord[],
  currentEmployees: EmployeePayRecord[],
  baselineEmployees: EmployeePayRecord[],
  orgTier: string,
): JudgementRow[] {
  const allJudgements: JudgementRow[] = [];

  const baselineMap = new Map(baselineEmployees.map(e => [e.employee_id, e]));
  const currentMap = new Map(currentEmployees.map(e => [e.employee_id, e]));

  // Group deltas by employee so we can run employee-level rules once per person
  const deltasByEmployee = new Map<string, DeltaRecord[]>();
  for (const delta of insertedDeltas) {
    const list = deltasByEmployee.get(delta.employee_id) ?? [];
    list.push(delta);
    deltasByEmployee.set(delta.employee_id, list);
  }

  for (const [employeeId, empDeltas] of deltasByEmployee) {
    const currentEmp = currentMap.get(employeeId);
    const baselineEmp = baselineMap.get(employeeId) ?? null;

    // Employee-level rules dedup on rule_id alone (they attach to the representative delta).
    const seenEmployeeRuleIds = new Set<string>();

    // Delta-level rules dedup on "rule_id:delta_id" so the same rule can fire on different
    // deltas for the same employee (e.g., R1 fires for net_pay AND gross_pay separately).
    const seenDeltaRuleKeys = new Set<string>();

    // Pick a representative delta for employee-level judgements (prefer net_pay)
    const repDelta = empDeltas.find(d => d.metric === 'net_pay') ?? empDeltas[0];

    // ── Employee-level rules ───────────────────────────────────────────────
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
        if (!seenEmployeeRuleIds.has(j.rule_id)) {
          seenEmployeeRuleIds.add(j.rule_id);
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
          const key = `${j.rule_id}:${delta.delta_id}`;
          if (!seenDeltaRuleKeys.has(key)) {
            seenDeltaRuleKeys.add(key);
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
