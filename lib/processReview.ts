import { createClient } from '@supabase/supabase-js';
import { CANONICAL_NUMERIC_FIELDS } from './canonicalSchema';
import { applyDeltaRules, applyEmployeeRules } from './rules';
import { getOrganizationTier } from './tierGating';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

interface Delta {
  review_session_id: string;
  organization_id: string;
  employee_id: string;
  metric: string;
  change_type: string;
  baseline_value: number | null;
  current_value: number | null;
  delta_absolute: number | null;
  delta_percentage: number | null;
  delta_id?: string;
}

interface JudgementRow {
  delta_id: string;
  is_material: boolean;
  is_blocker: boolean;
  confidence_score: number;
  reasoning: string;
  rule_id: string;
}

/**
 * All canonical numeric field DB column names used for delta calculation.
 * Derived from canonicalSchema — every decimal field with a dbColumn.
 */
const DELTA_METRICS = CANONICAL_NUMERIC_FIELDS.map(f => f.dbColumn!);

export async function processReview(reviewSessionId: string) {
  console.log(`[ProcessReview] Starting processing for session: ${reviewSessionId}`);

  try {
    // ── Step 1: Get datasets ──────────────────────────────────────────────
    const { data: datasets, error: dsError } = await supabase
      .from('payroll_dataset')
      .select('*')
      .eq('review_session_id', reviewSessionId);

    if (dsError) throw new Error(`Failed to fetch datasets: ${dsError.message}`);
    if (!datasets || datasets.length !== 2) {
      throw new Error(`Expected 2 datasets, found ${datasets?.length || 0}`);
    }

    const baseline = datasets.find(d => d.dataset_type === 'baseline');
    const current = datasets.find(d => d.dataset_type === 'current');

    if (!baseline || !baseline.dataset_id || !baseline.organization_id) {
      throw new Error('Baseline dataset is missing or incomplete');
    }
    if (!current || !current.dataset_id) {
      throw new Error('Current dataset is missing or incomplete');
    }

    const orgId = baseline.organization_id;

    // ── Step 2: Look up org tier ──────────────────────────────────────────
    const orgTier = await getOrganizationTier(orgId);
    console.log(`[ProcessReview] Organization tier: ${orgTier}`);

    // ── Step 3: Get employee records (with pay components) ────────────────
    const { data: baselineEmployees } = await supabase
      .from('employee_pay_record')
      .select('*, pay_component(*)')
      .eq('dataset_id', baseline.dataset_id);

    const { data: currentEmployees } = await supabase
      .from('employee_pay_record')
      .select('*, pay_component(*)')
      .eq('dataset_id', current.dataset_id);

    if (!baselineEmployees || baselineEmployees.length === 0) {
      throw new Error('Baseline dataset has no employee records');
    }
    if (!currentEmployees || currentEmployees.length === 0) {
      throw new Error('Current dataset has no employee records');
    }

    // Build lookup maps
    const baselineMap = new Map(baselineEmployees.map(e => [e.employee_id, e]));
    const currentMap = new Map(currentEmployees.map(e => [e.employee_id, e]));

    // Attach pay_components as a convenience field for rule evaluation
    for (const emp of [...baselineEmployees, ...currentEmployees]) {
      emp.pay_components = emp.pay_component || [];
    }

    // ── Step 4: Calculate deltas for ALL numeric fields ───────────────────
    const deltas: Delta[] = [];

    // 4a. Removed employees (in baseline but not in current)
    for (const [employeeId, baselineEmp] of baselineMap) {
      if (!currentMap.has(employeeId)) {
        deltas.push({
          review_session_id: reviewSessionId,
          organization_id: orgId,
          employee_id: employeeId,
          metric: 'net_pay',
          change_type: 'removed_employee',
          baseline_value: baselineEmp.net_pay,
          current_value: null,
          delta_absolute: null,
          delta_percentage: null,
        });
      }
    }

    // 4b. New employees and metric-level changes
    for (const [employeeId, currentEmp] of currentMap) {
      const baselineEmp = baselineMap.get(employeeId);

      if (!baselineEmp) {
        // New employee — create a single net_pay delta
        deltas.push({
          review_session_id: reviewSessionId,
          organization_id: orgId,
          employee_id: employeeId,
          metric: 'net_pay',
          change_type: 'new_employee',
          baseline_value: null,
          current_value: currentEmp.net_pay,
          delta_absolute: null,
          delta_percentage: null,
        });
      } else {
        // Existing employee — compute deltas for every numeric field
        let hasAnyDelta = false;

        for (const metric of DELTA_METRICS) {
          const bVal = baselineEmp[metric];
          const cVal = currentEmp[metric];

          // Skip if both null/undefined
          if (bVal == null && cVal == null) continue;

          const bNum = bVal != null ? Number(bVal) : 0;
          const cNum = cVal != null ? Number(cVal) : 0;

          if (bNum !== cNum) {
            const deltaAbs = cNum - bNum;
            const deltaPct = bNum !== 0 ? (deltaAbs / Math.abs(bNum)) * 100 : null;

            deltas.push({
              review_session_id: reviewSessionId,
              organization_id: orgId,
              employee_id: employeeId,
              metric,
              change_type: deltaAbs > 0 ? 'increase' : 'decrease',
              baseline_value: bNum,
              current_value: cNum,
              delta_absolute: deltaAbs,
              delta_percentage: deltaPct,
            });
            hasAnyDelta = true;
          }
        }

        // If no metrics changed, create a no_change delta for net_pay
        // so employee-level rules can still attach judgements
        if (!hasAnyDelta) {
          deltas.push({
            review_session_id: reviewSessionId,
            organization_id: orgId,
            employee_id: employeeId,
            metric: 'net_pay',
            change_type: 'no_change',
            baseline_value: baselineEmp.net_pay ?? 0,
            current_value: currentEmp.net_pay ?? 0,
            delta_absolute: 0,
            delta_percentage: 0,
          });
        }
      }
    }

    console.log(`[ProcessReview] Calculated ${deltas.length} deltas across ${DELTA_METRICS.length} metrics`);

    // ── Step 5: Insert deltas ─────────────────────────────────────────────
    if (deltas.length === 0) {
      console.log('[ProcessReview] No deltas to process');
      return { success: true, delta_count: 0, material_count: 0, blocker_count: 0 };
    }

    const insertedDeltas: any[] = [];
    const BATCH_SIZE = 200;
    for (let i = 0; i < deltas.length; i += BATCH_SIZE) {
      const batch = deltas.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase
        .from('payroll_delta')
        .insert(batch)
        .select();

      if (error) throw new Error(`Failed to insert deltas batch: ${error.message}`);
      if (data) insertedDeltas.push(...data);
    }

    // ── Step 6: Apply judgement rules ─────────────────────────────────────
    const allJudgementRows: JudgementRow[] = [];

    // Group inserted deltas by employee_id
    const deltasByEmployee = new Map<string, typeof insertedDeltas>();
    for (const delta of insertedDeltas) {
      const empDeltas = deltasByEmployee.get(delta.employee_id) || [];
      empDeltas.push(delta);
      deltasByEmployee.set(delta.employee_id, empDeltas);
    }

    for (const [employeeId, empDeltas] of deltasByEmployee) {
      const currentEmp = currentMap.get(employeeId);
      const baselineEmp = baselineMap.get(employeeId) || null;
      const seenRuleIds = new Set<string>();

      // Find a representative delta for employee-level judgements (prefer net_pay)
      const repDelta = empDeltas.find(d => d.metric === 'net_pay') || empDeltas[0];

      // 6a. Employee-level rules — run once per employee, de-duplicate via seenRuleIds
      const empRecord = currentEmp || baselineEmp;
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
            allJudgementRows.push({
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

      // 6b. Delta-specific rules — run for each metric delta
      for (const delta of empDeltas) {
        if (delta.change_type === 'new_employee' || delta.change_type === 'removed_employee') {
          continue; // Already handled by employee-level rules
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
              allJudgementRows.push({
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

    const materialCount = allJudgementRows.filter(j => j.is_material).length;
    const blockerCount = allJudgementRows.filter(j => j.is_blocker).length;

    console.log(`[ProcessReview] Generated ${allJudgementRows.length} judgements (${materialCount} material, ${blockerCount} blockers)`);

    // ── Step 7: Insert judgements ─────────────────────────────────────────
    if (allJudgementRows.length > 0) {
      for (let i = 0; i < allJudgementRows.length; i += BATCH_SIZE) {
        const batch = allJudgementRows.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
          .from('material_judgement')
          .insert(batch);

        if (error) throw new Error(`Failed to insert judgements batch: ${error.message}`);
      }
    }

    console.log(`[ProcessReview] Complete: ${insertedDeltas.length} deltas, ${materialCount} material, ${blockerCount} blockers`);

    return {
      success: true,
      delta_count: insertedDeltas.length,
      material_count: materialCount,
      blocker_count: blockerCount,
    };

  } catch (error: any) {
    console.error(`[ProcessReview] Error:`, error.message);
    throw error;
  }
}
