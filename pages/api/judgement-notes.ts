import { NextApiRequest, NextApiResponse } from 'next';
import { getServiceSupabase } from '../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { judgement_id, notes } = req.body;

  if (!judgement_id || typeof judgement_id !== 'string') {
    return res.status(400).json({ error: 'judgement_id is required' });
  }

  if (typeof notes !== 'string') {
    return res.status(400).json({ error: 'notes must be a string' });
  }

  try {
    const supabase = getServiceSupabase();

    // Ensure the column exists (idempotent migration)
    try {
      await supabase.rpc('exec', {
        sql: 'ALTER TABLE material_judgement ADD COLUMN IF NOT EXISTS reviewer_notes TEXT;',
      });
    } catch {
      // rpc may not exist; column may already exist — either way, proceed
    }

    const { data, error } = await supabase
      .from('material_judgement')
      .update({ reviewer_notes: notes || null })
      .eq('judgement_id', judgement_id)
      .select('judgement_id, reviewer_notes')
      .single();

    if (error) {
      console.error('Failed to save notes:', error);
      return res.status(500).json({ error: 'Failed to save notes', details: error.message });
    }

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Notes save error:', error);
    return res.status(500).json({ error: 'Failed to save notes', details: error.message });
  }
}
