/**
 * Auto-detect correct Supabase connection string
 * Tries multiple formats to find the working one
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const password = '1MKeIJgxhnoRL175';
const projectRef = 'uzfohswazhvaphbpwtdv';

// Try multiple connection string formats
const connectionStrings = [
  // Transaction pooler (various regions)
  `postgresql://postgres.${projectRef}:${password}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${projectRef}:${password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${projectRef}:${password}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${projectRef}:${password}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${projectRef}:${password}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,

  // Session pooler
  `postgresql://postgres.${projectRef}:${password}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres.${projectRef}:${password}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
];

console.log('\n═══════════════════════════════════════════════');
console.log('   Auto-detecting Supabase Connection');
console.log('═══════════════════════════════════════════════\n');

async function tryConnection(connectionString, index) {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });

  try {
    console.log(`Testing connection ${index + 1}/${connectionStrings.length}...`);
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    return connectionString;
  } catch (error) {
    await client.end().catch(() => {});
    return null;
  }
}

async function applyMigrations() {
  console.log('Finding working connection...\n');

  let workingConnection = null;

  for (let i = 0; i < connectionStrings.length; i++) {
    const result = await tryConnection(connectionStrings[i], i);
    if (result) {
      workingConnection = result;
      console.log(`\n✅ Found working connection!\n`);
      break;
    }
  }

  if (!workingConnection) {
    console.log('\n❌ Could not find working connection format.\n');
    console.log('Please execute migrations manually in Supabase Dashboard:');
    console.log('https://supabase.com/dashboard/project/uzfohswazhvaphbpwtdv/sql\n');
    process.exit(1);
  }

  // Apply migrations using working connection
  const client = new Client({
    connectionString: workingConnection,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('Connecting to database...\n');
    await client.connect();

    // Migration 007
    console.log('Applying Migration 007 (Create subscription table)...\n');
    const migration007 = readFileSync(join(__dirname, '..', 'supabase', 'migrations', '007_subscription_tracking.sql'), 'utf8');
    await client.query(migration007);
    console.log('✓ Migration 007 applied\n');

    // Migration 009
    console.log('Applying Migration 009 (Add trial tracking)...\n');
    const migration009 = readFileSync(join(__dirname, '..', 'supabase', 'migrations', '009_add_trial_tracking.sql'), 'utf8');
    await client.query(migration009);
    console.log('✓ Migration 009 applied\n');

    console.log('═══════════════════════════════════════════════');
    console.log('✅ All Migrations Applied Successfully!');
    console.log('═══════════════════════════════════════════════\n');

    console.log('Database ready with:');
    console.log('  ✓ Subscription table');
    console.log('  ✓ Trial tracking');
    console.log('  ✓ Helper functions\n');

  } catch (error) {
    console.error('\n❌ Migration Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigrations();
