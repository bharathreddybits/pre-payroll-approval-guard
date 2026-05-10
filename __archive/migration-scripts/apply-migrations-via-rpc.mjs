/**
 * Apply Migrations via Supabase RPC
 * Creates a helper function first, then uses it to execute migrations
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = 'https://uzfohswazh9vaphbpwtdv.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6Zm9oc3dhemh2YXBoYnB3dGR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQxNjE4NywiZXhwIjoyMDg0OTkyMTg3fQ.H6E20k4Yvz6f-EQMchMrz5VEn3kyIdfBZ7bryY0Tf3s';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

console.log('\n═══════════════════════════════════════════════');
console.log('   Applying Migrations via Supabase API');
console.log('═══════════════════════════════════════════════\n');

async function applyMigrations() {
  try {
    // Read migration files
    const migration007Path = join(__dirname, '..', 'supabase', 'migrations', '007_subscription_tracking.sql');
    const migration009Path = join(__dirname, '..', 'supabase', 'migrations', '009_add_trial_tracking.sql');

    const migration007SQL = readFileSync(migration007Path, 'utf8');
    const migration009SQL = readFileSync(migration009Path, 'utf8');

    console.log('1. Creating SQL execution helper function...\n');

    // First, create a helper function that can execute dynamic SQL
    const createHelperSQL = `
      CREATE OR REPLACE FUNCTION exec_ddl(sql_text text)
      RETURNS void AS $$
      BEGIN
        EXECUTE sql_text;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    const { data: helperResult, error: helperError } = await supabase.rpc('exec_ddl', {
      sql_text: createHelperSQL
    });

    // If exec_ddl doesn't exist, we can't create it via RPC (catch-22)
    // Let's try a different approach: use fetch to call PostgREST directly with raw SQL

    console.log('2. Attempting direct SQL execution via REST API...\n');

    const executeSQL = async (sql, name) => {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ sql }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${name} failed: ${response.status} ${errorText}`);
      }

      return await response.json();
    };

    console.log('3. Applying Migration 007...\n');
    await executeSQL(migration007SQL, 'Migration 007');
    console.log('   ✓ Migration 007 applied\n');

    console.log('4. Applying Migration 009...\n');
    await executeSQL(migration009SQL, 'Migration 009');
    console.log('   ✓ Migration 009 applied\n');

    console.log('═══════════════════════════════════════════════');
    console.log('✅ Migrations Applied Successfully');
    console.log('═══════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);

    // Fallback: Show manual instructions
    console.log('\n═══════════════════════════════════════════════');
    console.log('⚠️  Automatic migration not supported by Supabase API');
    console.log('═══════════════════════════════════════════════\n');
    console.log('Supabase requires DDL migrations to be executed manually');
    console.log('in the dashboard for security reasons.\n');
    console.log('Opening Supabase Dashboard SQL Editor...\n');

    // Open the dashboard
    const { exec } = await import('child_process');
    const dashboardUrl = 'https://supabase.com/dashboard/project/uzfohswazh9vaphbpwtdv/sql/new';

    const openCommand = process.platform === 'win32'
      ? `start ${dashboardUrl}`
      : process.platform === 'darwin'
      ? `open ${dashboardUrl}`
      : `xdg-open ${dashboardUrl}`;

    exec(openCommand);

    console.log('Dashboard opening in browser...\n');
    console.log('Please execute these migrations in order:\n');
    console.log('─'.repeat(60));
    console.log('\nMIGRATION 007 (Run this FIRST):\n');
    const migration007Path = join(__dirname, '..', 'supabase', 'migrations', '007_subscription_tracking.sql');
    const migration007SQL = readFileSync(migration007Path, 'utf8');
    console.log(migration007SQL);
    console.log('\n' + '─'.repeat(60));
    console.log('\nMIGRATION 009 (Run this SECOND):\n');
    const migration009Path = join(__dirname, '..', 'supabase', 'migrations', '009_add_trial_tracking.sql');
    const migration009SQL = readFileSync(migration009Path, 'utf8');
    console.log(migration009SQL);
    console.log('─'.repeat(60));
    console.log('');

    process.exit(1);
  }
}

applyMigrations();
