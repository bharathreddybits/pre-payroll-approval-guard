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

    // Test database connection by querying organization table
    const { data, error } = await supabase
      .from('organization')
      .select('organization_id')
      .limit(1);

    if (error) {
      console.error('Supabase connection error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to connect to database',
        error: error.message
      });
    }

    return res.status(200).json({
      status: 'ok',
      message: 'Supabase connection successful',
      timestamp: new Date().toISOString()
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
