/**
 * Apply Trial Tracking Migration
 * Executes the 009_add_trial_tracking.sql migration
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env
const envPath = join(__dirname, '..', '.env');
const envContent = readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#][^=]*)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('\n═══════════════════════════════════════════════');
console.log('   Apply Trial Tracking Migration');
console.log('═══════════════════════════════════════════════\n');

// Read the migration file
const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '009_add_trial_tracking.sql');
const migrationSQL = readFileSync(migrationPath, 'utf8');

async function main() {
  try {
    console.log('1. Applying trial tracking migration...\n');

    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';

      // Skip comment-only statements
      if (statement.trim().startsWith('--')) continue;

      console.log(`   Executing statement ${i + 1}/${statements.length}...`);

      const { error } = await supabase.rpc('exec_sql', { sql: statement });

      // If exec_sql doesn't exist, try direct execution via a workaround
      if (error && error.message?.includes('exec_sql')) {
        // Try using the pg library approach
        console.log('   RPC method not available, using direct execution...');

        // Import pg dynamically
        const pg = await import('pg');
        const { Client } = pg.default;

        // We need a direct connection string which we don't have
        // Fall back to manual execution instructions
        console.log('\n⚠️  Direct SQL execution not available via API.\n');
        console.log('Applying migration via Supabase Dashboard...\n');
        console.log('Please execute this SQL in Supabase Dashboard:\n');
        console.log('=' .repeat(60));
        console.log(migrationSQL);
        console.log('=' .repeat(60));
        console.log('\nOr use: supabase db push\n');
        process.exit(1);
      }

      if (error) {
        // Some errors are expected (like "already exists")
        if (error.message?.includes('already exists')) {
          console.log(`   ⚠️  Already exists, skipping...`);
        } else {
          throw error;
        }
      }
    }

    console.log('\n✅ Migration applied successfully!\n');
    console.log('═══════════════════════════════════════════════');
    console.log('Trial Tracking Features Enabled:');
    console.log('═══════════════════════════════════════════════\n');
    console.log('✓ trial_end_date column added');
    console.log('✓ trial_days column added');
    console.log('✓ is_trial_expired() function created');
    console.log('✓ trial_days_remaining() function created\n');
    console.log('Next Steps:');
    console.log('1. Test with: node scripts/test-trial-expiration.mjs expired');
    console.log('2. Log in and verify trial banner appears');
    console.log('3. Monitor trial conversions\n');

  } catch (error) {
    console.error('\n❌ Error applying migration:', error.message);

    // Provide helpful instructions
    console.log('\nManual Application Required:\n');
    console.log('1. Open Supabase Dashboard: https://supabase.com/dashboard');
    console.log('2. Navigate to: SQL Editor');
    console.log('3. Copy and execute this SQL:\n');
    console.log('File: supabase/migrations/009_add_trial_tracking.sql\n');
    console.log(migrationSQL);
    console.log('\n');
    process.exit(1);
  }
}

main();
