import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getServiceSupabase } from '../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth: require Bearer token
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authorization required' });

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

  const { judgement_id, notes } = req.body;

  if (!judgement_id || typeof judgement_id !== 'string') {
    return res.status(400).json({ error: 'judgement_id is required' });
  }

  if (typeof notes !== 'string') {
    return res.status(400).json({ error: 'notes must be a string' });
  }

  try {
    const supabase = getServiceSupabase();

    // Verify caller's org owns the session that contains this judgement
    const { data: mapping } = await supabase
      .from('user_organization_mapping')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();
    if (!mapping) return res.status(403).json({ error: 'No organization found' });

    // Trace: judgement → delta → review_session → organization
    const { data: judgement } = await supabase
      .from('material_judgement')
      .select('delta_id')
      .eq('judgement_id', judgement_id)
      .single();
    if (!judgement) return res.status(404).json({ error: 'Judgement not found' });

    const { data: delta } = await supabase
      .from('payroll_delta')
      .select('review_session_id')
      .eq('delta_id', judgement.delta_id)
      .single();
    if (!delta) return res.status(404).json({ error: 'Delta not found' });

    const { data: session } = await supabase
      .from('review_session')
      .select('organization_id')
      .eq('review_session_id', delta.review_session_id)
      .single();
    if (!session || session.organization_id !== mapping.organization_id) {
      return res.status(403).json({ error: 'Access denied' });
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
