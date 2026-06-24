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
import { saveDeltas, saveJudgements, updateSessionStatus, updateSessionCounts } from './persistence';
import type { EmployeePayRecord } from './rulesEngine';

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
    // Select only the columns needed by the rules engine — exclude 'metadata' which
    // stores the full raw_row JSON (up to several KB per employee). Loading metadata
    // for 10,000 employees would materialize 50+ MB in Node.js memory unnecessarily.
    // Cast to any to bypass Supabase's literal-type select inference; we assert the
    // correct type after destructuring.
    const EMPLOYEE_COLUMNS = 'record_id,dataset_id,employee_id,employee_name,department,' +
      'employment_status,pay_group,pay_frequency,pay_type,flsa_classification,' +
      'regular_hours,overtime_hours,other_paid_hours,total_hours_worked,' +
      'base_earnings,overtime_pay,bonus_earnings,other_earnings,' +
      'federal_income_tax,social_security_tax,medicare_tax,' +
      'state_income_tax,local_tax,gross_pay,net_pay,total_deductions';

    const [
      { data: baselineEmployeesRaw, error: blErr },
      { data: currentEmployeesRaw, error: curErr },
    ] = await Promise.all([
      supabase.from('employee_pay_record').select(EMPLOYEE_COLUMNS as any).eq('dataset_id', baselineDs.dataset_id),
      supabase.from('employee_pay_record').select(EMPLOYEE_COLUMNS as any).eq('dataset_id', currentDs.dataset_id),
    ]);
    const baselineEmployees = baselineEmployeesRaw as EmployeePayRecord[] | null;
    const currentEmployees = currentEmployeesRaw as EmployeePayRecord[] | null;

    if (blErr) throw new Error(`Failed to load baseline employees: ${blErr.message}`);
    if (curErr) throw new Error(`Failed to load current employees: ${curErr.message}`);
    if (!baselineEmployees?.length) throw new Error('Baseline dataset has no employee records');
    if (!currentEmployees?.length) throw new Error('Current dataset has no employee records');

    // Initialize pay_components to [] if absent — rules that check component-level
    // data (e.g., 401K_OVER_IRS_LIMIT) iterate this array. Overwriting existing
    // data was a bug: if pay_components is ever joined from a separate table in
    // future, the mutation would silently clear it before rule evaluation.
    for (const emp of [...baselineEmployees, ...currentEmployees]) {
      if (!emp.pay_components) emp.pay_components = [];
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

    // Write denormalized counts to review_session for O(1) dashboard reads
    await updateSessionCounts(reviewSessionId, insertedDeltas.length, materialCount, blockerCount);

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
