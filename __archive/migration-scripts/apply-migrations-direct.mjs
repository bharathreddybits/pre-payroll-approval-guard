/**
 * Direct Database Migration Application
 * Applies migrations 007 and 009 using direct PostgreSQL connection
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database connection string - exact format from user
const connectionString = 'postgresql://postgres:1MKeIJgxhnoRL175@db.uzfohswazhvaphbpwtdv.supabase.co:5432/postgres';

console.log('\n═══════════════════════════════════════════════');
console.log('   Applying Database Migrations');
console.log('═══════════════════════════════════════════════\n');

async function applyMigrations() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('1. Connecting to database...\n');
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
    console.log('✅ All Migrations Applied Successfully');
    console.log('═══════════════════════════════════════════════\n');

    console.log('Database is now ready with:');
    console.log('  ✓ Subscription table created');
    console.log('  ✓ Trial tracking columns added');
    console.log('  ✓ Helper functions created (is_trial_expired, trial_days_remaining)');
    console.log('  ✓ RLS policies enabled\n');

    console.log('Next steps:');
    console.log('  1. Test trial flow: node scripts/test-trial-expiration.mjs expired');
    console.log('  2. Deploy to production: git push\n');

  } catch (error) {
    console.error('\n❌ Migration Error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigrations();
