// Apply migration using Supabase client
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env file manually
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('Reading migration file...\n');

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '002_refined_schema.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  console.log('Applying migration via Supabase Management API...\n');

  try {
    // Use Supabase client to execute raw SQL via RPC
    // First, let's try creating the tables one by one using the client methods

    // Split into executable statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    console.log(`Processing ${statements.length} SQL statements...\n`);

    // Use fetch to call Supabase SQL execution via Database API
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1];

    // Execute via SQL query using Supabase's database webhooks/functions
    // Since we can't execute raw SQL directly, we'll need to use a different approach

    // Alternative: Use the SQL endpoint directly
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({ sql: migrationSQL })
    });

    if (!response.ok) {
      const error = await response.text();
      console.log('Direct SQL execution not available via REST API');
      console.log('Error:', error);
      console.log('\n⚠️  Need to use Supabase Dashboard SQL Editor or supabase CLI\n');

      // Let's try using SQL panel approach - execute via Database URL
      console.log('Attempting alternative approach via pg library...\n');
      await executeViaPg();
      return;
    }

    const result = await response.json();
    console.log('✅ Migration applied successfully');
    console.log('Result:', result);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\nAttempting alternative approach...\n');
    await executeViaPg();
  }
}

async function executeViaPg() {
  try {
    const { default: postgres } = await import('postgres');

    // Try different connection string formats
    const formats = [
      `postgres://postgres:GodSpeed4$@db.uzfohswazhvaphbpwtdv.supabase.co:5432/postgres`,
      `postgres://postgres:GodSpeed4$@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`,
      `postgres://postgres.uzfohswazhvaphbpwtdv:GodSpeed4$@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`
    ];

    let connected = false;
    let sql;

    for (const connString of formats) {
      try {
        console.log('Trying connection format...');
        sql = postgres(connString, { ssl: 'require', connect_timeout: 10 });
        await sql`SELECT 1`;
        console.log('✅ Connected successfully\n');
        connected = true;
        break;
      } catch (err) {
        console.log('Failed, trying next format...');
        if (sql) await sql.end();
      }
    }

    if (!connected) {
      console.log('\n❌ Could not establish database connection');
      console.log('\nPlease run migration manually:');
      console.log('1. Go to https://supabase.com/dashboard/project/uzfohswazhvaphbpwtdv/sql');
      console.log('2. Open SQL Editor');
      console.log('3. Copy contents of: supabase/migrations/002_refined_schema.sql');
      console.log('4. Paste and run\n');
      process.exit(1);
    }

    // Read and execute migration
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '002_refined_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('Applying migration...\n');
    await sql.unsafe(migrationSQL);
    console.log('✅ Migration applied successfully\n');

    // Verify
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('organization', 'review_session', 'payroll_delta', 'material_judgement', 'approval')
      ORDER BY table_name
    `;

    console.log('Tables created:');
    tables.forEach(t => console.log(`  ✅ ${t.table_name}`));
    console.log();

    await sql.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nPlease run migration manually:');
    console.log('1. Go to https://supabase.com/dashboard/project/uzfohswazhvaphbpwtdv/sql');
    console.log('2. Open SQL Editor');
    console.log('3. Copy contents of: supabase/migrations/002_refined_schema.sql');
    console.log('4. Paste and run\n');
    process.exit(1);
  }
}

applyMigration();
