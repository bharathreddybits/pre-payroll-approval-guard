import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Security: Only allow in development or with secret key
  const setupKey = req.headers['x-setup-key'];
  if (process.env.NODE_ENV === 'production' && setupKey !== process.env.SETUP_SECRET_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Read migration file
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '002_refined_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Split SQL into statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    const results = [];

    // Execute each statement
    for (const statement of statements) {
      if (!statement.trim() || statement.trim().startsWith('/*')) continue;

      try {
        // Use rpc to execute raw SQL if available
        const { data, error } = await supabase.rpc('exec', {
          sql: statement + ';'
        });

        if (error) {
          results.push({
            statement: statement.substring(0, 100) + '...',
            status: 'skipped',
            reason: error.message
          });
        } else {
          results.push({
            statement: statement.substring(0, 100) + '...',
            status: 'success'
          });
        }
      } catch (err: any) {
        results.push({
          statement: statement.substring(0, 100) + '...',
          status: 'error',
          error: err.message
        });
      }
    }

    // Verify tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['organization', 'review_session', 'payroll_delta', 'material_judgement', 'approval']);

    if (!tablesError && tables) {
      return res.status(200).json({
        message: 'Migration completed',
        results,
        tablesFound: tables.map(t => t.table_name)
      });
    }

    return res.status(200).json({
      message: 'Migration executed but verification failed',
      results,
      verificationError: tablesError?.message
    });

  } catch (error: any) {
    return res.status(500).json({
      error: 'Migration failed',
      details: error.message
    });
  }
}
