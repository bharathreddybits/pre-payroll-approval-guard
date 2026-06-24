import { NextApiRequest, NextApiResponse } from 'next';
import { getServiceSupabase } from '../../lib/supabase';

/**
 * Health check endpoint - verifies Supabase connection
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getServiceSupabase();

    // Use SELECT 1 via RPC rather than querying a data table.
    // Querying 'organization' for health checks returns tenant data in the
    // response body and unnecessarily touches a multi-tenant table on every
    // load-balancer ping.
    const { error } = await supabase.rpc('ping').maybeSingle();

    if (error) {
      // Fallback: rpc('ping') may not exist — try a minimal version check
      const { error: fallbackErr } = await supabase.from('review_session').select('review_session_id').limit(0);
      if (fallbackErr) {
        console.error('Supabase connection error:', fallbackErr);
        return res.status(500).json({
          status: 'error',
          message: 'Failed to connect to database',
        });
      }
    }

    return res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Health check failed:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message
    });
  }
}
