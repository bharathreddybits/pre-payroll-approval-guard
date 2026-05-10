// lib/payroll/persistence.ts
//
// Saves calculated deltas and judgements to Supabase.
// Also manages review session status updates.
//
// All inserts are batched for performance.
// Delta inserts try the expanded schema first (all 25+ metrics),
// then fall back to base metrics (net_pay, gross_pay, total_deductions)
// if the database hasn't had migration 003 applied yet.

import { getServiceSupabase } from '../supabase';
import type { PayrollDelta } from './diff';
import type { JudgementRow } from './rulesEngine';

const BATCH_SIZE = 200;

// The 3 columns that exist in the original schema before migration 003
const BASE_METRICS = ['net_pay', 'gross_pay', 'total_deductions'];

export async function saveDeltas(deltas: PayrollDelta[]): Promise<any[]> {
  if (deltas.length === 0) return [];

  const supabase = getServiceSupabase();
  const insertedDeltas: any[] = [];

  // Try inserting the first batch with all metrics.
  // If it fails (e.g. expanded columns don't exist), fall back to base metrics only.
  const firstBatch = deltas.slice(0, Math.min(BATCH_SIZE, deltas.length));
  const { data: firstData, error: firstError } = await supabase
    .from('payroll_delta')
    .insert(firstBatch)
    .select();

  if (firstError) {
    // Expanded columns likely don't exist in this DB — fall back to base metrics
    console.warn(`[Persistence] Expanded delta insert failed (${firstError.message}), using base metrics only`);

    const baseDeltas = deltas.filter(d =>
      BASE_METRICS.includes(d.metric) ||
      d.change_type === 'new_employee' ||
      d.change_type === 'removed_employee'
    );

    for (let i = 0; i < baseDeltas.length; i += BATCH_SIZE) {
      const batch = baseDeltas.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase.from('payroll_delta').insert(batch).select();
      if (error) throw new Error(`Failed to save deltas: ${error.message}`);
      if (data) insertedDeltas.push(...data);
    }
  } else {
    // First batch succeeded — continue inserting the rest
    if (firstData) insertedDeltas.push(...firstData);

    for (let i = BATCH_SIZE; i < deltas.length; i += BATCH_SIZE) {
      const batch = deltas.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase.from('payroll_delta').insert(batch).select();
      if (error) throw new Error(`Failed to save deltas: ${error.message}`);
      if (data) insertedDeltas.push(...data);
    }
  }

  return insertedDeltas;
}

export async function saveJudgements(judgements: JudgementRow[]): Promise<void> {
  if (judgements.length === 0) return;

  const supabase = getServiceSupabase();

  for (let i = 0; i < judgements.length; i += BATCH_SIZE) {
    const batch = judgements.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('material_judgement').insert(batch);
    if (error) throw new Error(`Failed to save judgements: ${error.message}`);
  }
}

export async function updateSessionStatus(
  reviewSessionId: string,
  status: 'in_progress' | 'completed',
): Promise<void> {
  const supabase = getServiceSupabase();
  const { error } = await supabase
    .from('review_session')
    .update({ status })
    .eq('review_session_id', reviewSessionId);

  if (error) {
    // Non-fatal — log but don't throw; the actual data was saved successfully
    console.error(`[Persistence] Failed to update session status to '${status}': ${error.message}`);
  }
}
