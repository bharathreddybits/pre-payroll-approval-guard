// lib/payroll/persistence.ts
//
// Saves calculated deltas and judgements to Supabase.
// Also manages review session status updates.
//
// All inserts are batched for performance.
// Migration 003 adds expanded metric columns to payroll_delta — it is required.
// No probe/fallback pattern: if the schema is missing those columns, the insert
// fails with a clear error rather than silently storing incomplete data.

import { getServiceSupabase } from '../supabase';
import type { PayrollDelta } from './diff';
import type { JudgementRow, DeltaRecord } from './rulesEngine';

const BATCH_SIZE = 200;

export async function saveDeltas(deltas: PayrollDelta[]): Promise<DeltaRecord[]> {
  if (deltas.length === 0) return [];

  const supabase = getServiceSupabase();
  const insertedDeltas: DeltaRecord[] = [];

  for (let i = 0; i < deltas.length; i += BATCH_SIZE) {
    const batch = deltas.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase.from('payroll_delta').insert(batch).select();
    if (error) throw new Error(`Failed to save deltas: ${error.message}`);
    if (data) insertedDeltas.push(...(data as DeltaRecord[]));
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

type SessionStatus = 'in_progress' | 'pending_mapping' | 'reviewed' | 'completed' | 'approved' | 'failed';

export async function updateSessionStatus(
  reviewSessionId: string,
  status: SessionStatus,
): Promise<void> {
  const supabase = getServiceSupabase();
  const { error } = await supabase
    .from('review_session')
    .update({ status })
    .eq('review_session_id', reviewSessionId);

  if (error) throw new Error(`Failed to update session status to '${status}': ${error.message}`);
}
