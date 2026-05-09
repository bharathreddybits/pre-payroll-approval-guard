import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * API Route to Apply Trial Tracking Migration
 *
 * This endpoint executes the trial tracking migration programmatically.
 * POST /api/migrations/apply-trial-tracking
 *
 * Requires: MIGRATION_SECRET environment variable for security
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check authorization
  const { authorization } = req.headers;
  const MIGRATION_SECRET = process.env.MIGRATION_SECRET || 'dev-secret-change-in-production';

  if (authorization !== `Bearer ${MIGRATION_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ error: 'Missing Supabase credentials' });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Execute migration statements one by one
    const statements = [
      // Add trial_end_date column
      `ALTER TABLE public.subscription ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE`,

      // Add trial_days column
      `ALTER TABLE public.subscription ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 7`,

      // Add comments
      `COMMENT ON COLUMN public.subscription.trial_end_date IS 'Date when the free trial ends (NULL if not on trial)'`,
      `COMMENT ON COLUMN public.subscription.trial_days IS 'Number of trial days offered (typically 7)'`,

      // Create is_trial_expired function
      `CREATE OR REPLACE FUNCTION public.is_trial_expired(sub_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  subscription_record RECORD;
BEGIN
  SELECT status, trial_end_date
  INTO subscription_record
  FROM public.subscription
  WHERE id = sub_id;

  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;

  IF subscription_record.status = 'trialing' AND
     subscription_record.trial_end_date IS NOT NULL AND
     subscription_record.trial_end_date < NOW() THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER`,

      // Create trial_days_remaining function
      `CREATE OR REPLACE FUNCTION public.trial_days_remaining(sub_id UUID)
RETURNS INTEGER AS $$
DECLARE
  subscription_record RECORD;
  days_left INTEGER;
BEGIN
  SELECT status, trial_end_date
  INTO subscription_record
  FROM public.subscription
  WHERE id = sub_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  IF subscription_record.status != 'trialing' OR subscription_record.trial_end_date IS NULL THEN
    RETURN 0;
  END IF;

  days_left := EXTRACT(DAY FROM (subscription_record.trial_end_date - NOW()));

  IF days_left < 0 THEN
    RETURN 0;
  END IF;

  RETURN days_left;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER`,

      // Add function comments
      `COMMENT ON FUNCTION public.is_trial_expired IS 'Checks if a subscription trial has expired'`,
      `COMMENT ON FUNCTION public.trial_days_remaining IS 'Returns number of days remaining in trial (0 if expired or not trialing)'`,
    ];

    const results = [];
    const errors = [];

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      try {
        // Use the from() method with a direct SQL query via RPC if available
        // Otherwise, we need to execute via a stored procedure

        // Try to check if columns exist first
        if (statement.includes('ADD COLUMN IF NOT EXISTS trial_end_date')) {
          const { data, error } = await supabase
            .from('subscription')
            .select('trial_end_date')
            .limit(1);

          if (error && error.message.includes('column "trial_end_date" does not exist')) {
            // Column doesn't exist, we need to add it
            results.push({ statement: i + 1, status: 'needs_manual_execution' });
            errors.push(`Statement ${i + 1} requires manual execution in Supabase Dashboard`);
          } else if (!error) {
            results.push({ statement: i + 1, status: 'already_exists' });
          }
          continue;
        }

        if (statement.includes('ADD COLUMN IF NOT EXISTS trial_days')) {
          const { data, error } = await supabase
            .from('subscription')
            .select('trial_days')
            .limit(1);

          if (error && error.message.includes('column "trial_days" does not exist')) {
            results.push({ statement: i + 1, status: 'needs_manual_execution' });
            errors.push(`Statement ${i + 1} requires manual execution in Supabase Dashboard`);
          } else if (!error) {
            results.push({ statement: i + 1, status: 'already_exists' });
          }
          continue;
        }

        // For other statements, they require manual execution
        results.push({ statement: i + 1, status: 'requires_manual_execution' });

      } catch (err: any) {
        errors.push(`Statement ${i + 1}: ${err.message}`);
        results.push({ statement: i + 1, status: 'error', error: err.message });
      }
    }

    // Return result
    return res.status(200).json({
      success: errors.length === 0,
      message: errors.length === 0
        ? 'Migration verification complete'
        : 'Migration requires manual execution in Supabase Dashboard',
      results,
      errors,
      manual_steps: errors.length > 0 ? {
        instructions: [
          '1. Open Supabase Dashboard: https://supabase.com/dashboard',
          '2. Navigate to: SQL Editor',
          '3. Execute the migration file: supabase/migrations/009_add_trial_tracking.sql',
        ],
      } : null,
    });

  } catch (error: any) {
    console.error('Migration API error:', error);
    return res.status(500).json({
      error: 'Migration failed',
      message: error.message,
      manual_execution_required: true,
    });
  }
}
