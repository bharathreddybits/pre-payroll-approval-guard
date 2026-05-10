/**
 * Apply Migrations Using Supabase Admin SDK
 * Uses pg library with Supabase connection pooler
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try connection pooler instead of direct connection
// Format: postgresql://postgres.[project-ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
const connectionString = 'postgresql://postgres.uzfohswazhvaphbpwtdv:SuperGodSpeed4$@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

console.log('\n═══════════════════════════════════════════════');
console.log('   Applying Database Migrations');
console.log('═══════════════════════════════════════════════\n');

async function applyMigrations() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('1. Connecting to database via connection pooler...\n');
    await client.connect();
    console.log('   ✓ Connected\n');

    // Migration 007: Create subscription table
    console.log('2. Applying Migration 007 (Create subscription table)...\n');
    const migration007Path = join(__dirname, '..', 'supabase', 'migrations', '007_subscription_tracking.sql');
    const migration007SQL = readFileSync(migration007Path, 'utf8');

    await client.query(migration007SQL);
    console.log('   ✓ Migration 007 applied successfully\n');

    // Migration 009: Add trial tracking
    console.log('3. Applying Migration 009 (Add trial tracking)...\n');
    const migration009Path = join(__dirname, '..', 'supabase', 'migrations', '009_add_trial_tracking.sql');
    const migration009SQL = readFileSync(migration009Path, 'utf8');

    await client.query(migration009SQL);
    console.log('   ✓ Migration 009 applied successfully\n');

    console.log('═══════════════════════════════════════════════');
    console.log('✅ All Migrations Applied Successfully!');
    console.log('═══════════════════════════════════════════════\n');

    console.log('Database is now ready with:');
    console.log('  ✓ Subscription table created');
    console.log('  ✓ Trial tracking columns added');
    console.log('  ✓ Helper functions created (is_trial_expired, trial_days_remaining)');
    console.log('  ✓ RLS policies enabled\n');

    console.log('Next steps:');
    console.log('  1. Test trial flow: node scripts/test-trial-expiration.mjs expired');
    console.log('  2. Push to GitHub: git add . && git commit && git push\n');

  } catch (error) {
    console.error('\n❌ Migration Error:', error.message);
    console.error('\nFull error:', error);
    console.error('\nTrying alternative connection...\n');

    // If pooler fails, output the SQL for manual execution
    console.log('Please execute the following SQL in Supabase Dashboard:\n');
    console.log('https://supabase.com/dashboard/project/uzfohswazhvaphbpwtdv/sql\n');
    const migration007 = readFileSync(join(__dirname, '..', 'supabase', 'migrations', '007_subscription_tracking.sql'), 'utf8');
    const migration009 = readFileSync(join(__dirname, '..', 'supabase', 'migrations', '009_add_trial_tracking.sql'), 'utf8');
    console.log(migration007 + '\n\n' + migration009);

    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigrations();
