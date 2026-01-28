// Apply migration via Supabase REST API by creating tables via HTTP requests
const fs = require('fs');
const path = require('path');

// Load .env
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

async function executeSQL(sql) {
  // Try using Supabase's SQL execution endpoint
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Prefer': 'params=single-object'
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SQL execution failed: ${response.status} - ${text}`);
  }

  return await response.json();
}

async function applyMigration() {
  console.log('Applying migration via Supabase Management API...\n');

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '002_refined_schema.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  // Read the SQL file and execute it via Management API
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1];

  console.log(`Project: ${projectRef}`);
  console.log('Executing migration via Management API...\n');

  // Use Supabase Management API to execute SQL
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`
    },
    body: JSON.stringify({
      query: migrationSQL
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.log('Management API not available with service role key');
    console.log('Response:', error, '\n');
    throw new Error('Management API authentication failed');
  }

  const result = await response.json();
  console.log('✅ Migration applied successfully');
  console.log('Result:', result);
}

applyMigration().catch(err => {
  console.error('❌ Failed:', err.message);
  console.log('\nFalling back to manual SQL execution...\n');
  console.log('Please execute the migration manually:');
  console.log('1. Go to: https://supabase.com/dashboard/project/uzfohswazhvaphbpwtdv/sql/new');
  console.log('2. Copy the entire file: supabase/migrations/002_refined_schema.sql');
  console.log('3. Paste and click "Run"\n');
  process.exit(1);
});
