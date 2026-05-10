// lib/payroll/processor.ts
//
// Orchestrates the full payroll review processing pipeline.
// This is the single entry point called from API routes.
//
// Pipeline (in order):
//
//   1. Load datasets from DB          (payroll_dataset table)
//   2. Load employee records from DB  (employee_pay_record table)
//   3. Calculate deltas               (lib/payroll/diff.ts)
//   4. Save deltas to DB              (lib/payroll/persistence.ts)
//   5. Run all judgement rules         (lib/payroll/rulesEngine.ts)
//   6. Save judgements to DB          (lib/payroll/persistence.ts)
//   7. Mark session as completed
//
// AI explanations are NOT generated here.
// They are generated on-demand in the review API (pages/api/review/[reviewSessionId].ts)
// when the reviewer opens the review page.

import { getServiceSupabase } from '../supabase';
import { getOrganizationTier } from '../tierGating';
import { calculateDeltas } from './diff';
import { runRulesEngine } from './rulesEngine';
import { saveDeltas, saveJudgements, updateSessionStatus } from './persistence';

export interface ProcessingResult {
  success: boolean;
  delta_count: number;
  material_count: number;
  blocker_count: number;
  error?: string;
}

export async function processPayrollReview(reviewSessionId: string): Promise<ProcessingResult> {
  console.log(`[Processor] Starting: ${reviewSessionId}`);

  const supabase = getServiceSupabase();

  try {
    // ── Step 1: Load datasets ─────────────────────────────────────────────
    const { data: datasets, error: dsError } = await supabase
      .from('payroll_dataset')
      .select('*')
      .eq('review_session_id', reviewSessionId);

    if (dsError) throw new Error(`Failed to load datasets: ${dsError.message}`);
    if (!datasets || datasets.length !== 2) {
      throw new Error(`Expected 2 datasets (baseline + current), found ${datasets?.length ?? 0}`);
    }

    const baselineDs = datasets.find(d => d.dataset_type === 'baseline');
    const currentDs = datasets.find(d => d.dataset_type === 'current');

    if (!baselineDs?.dataset_id || !baselineDs?.organization_id) {
      throw new Error('Baseline dataset is missing or incomplete');
    }
    if (!currentDs?.dataset_id) {
      throw new Error('Current dataset is missing or incomplete');
    }

    const orgId = baselineDs.organization_id;
    const orgTier = await getOrganizationTier(orgId);
    console.log(`[Processor] Org tier: ${orgTier}, session: ${reviewSessionId}`);

    // ── Step 2: Load employee records ────────────────────────────────────
    const [
      { data: baselineEmployees, error: blErr },
      { data: currentEmployees, error: curErr },
    ] = await Promise.all([
      supabase.from('employee_pay_record').select('*').eq('dataset_id', baselineDs.dataset_id),
      supabase.from('employee_pay_record').select('*').eq('dataset_id', currentDs.dataset_id),
    ]);

    if (blErr) throw new Error(`Failed to load baseline employees: ${blErr.message}`);
    if (curErr) throw new Error(`Failed to load current employees: ${curErr.message}`);
    if (!baselineEmployees?.length) throw new Error('Baseline dataset has no employee records');
    if (!currentEmployees?.length) throw new Error('Current dataset has no employee records');

    // Required by rule evaluation functions
    for (const emp of [...baselineEmployees, ...currentEmployees]) {
      emp.pay_components = [];
    }

    console.log(`[Processor] ${baselineEmployees.length} baseline, ${currentEmployees.length} current employees`);

    // ── Step 3: Calculate deltas ──────────────────────────────────────────
    const deltas = calculateDeltas(reviewSessionId, orgId, baselineEmployees, currentEmployees);
    console.log(`[Processor] ${deltas.length} deltas calculated`);

    if (deltas.length === 0) {
      await updateSessionStatus(reviewSessionId, 'completed');
      return { success: true, delta_count: 0, material_count: 0, blocker_count: 0 };
    }

    // ── Step 4: Save deltas ───────────────────────────────────────────────
    const insertedDeltas = await saveDeltas(deltas);
    console.log(`[Processor] ${insertedDeltas.length} deltas saved`);

    // ── Step 5: Run judgement rules ───────────────────────────────────────
    const judgements = runRulesEngine(insertedDeltas, currentEmployees, baselineEmployees, orgTier);
    const materialCount = judgements.filter(j => j.is_material).length;
    const blockerCount = judgements.filter(j => j.is_blocker).length;
    console.log(`[Processor] ${judgements.length} judgements (${materialCount} material, ${blockerCount} blockers)`);

    // ── Step 6: Save judgements ───────────────────────────────────────────
    await saveJudgements(judgements);

    // ── Step 7: Mark session complete ────────────────────────────────────
    await updateSessionStatus(reviewSessionId, 'completed');

    console.log(`[Processor] Done ✓ — ${insertedDeltas.length} deltas, ${materialCount} material, ${blockerCount} blockers`);

    return {
      success: true,
      delta_count: insertedDeltas.length,
      material_count: materialCount,
      blocker_count: blockerCount,
    };

  } catch (error: any) {
    console.error(`[Processor] Failed for session ${reviewSessionId}:`, error.message);
    throw error;
  }
}
