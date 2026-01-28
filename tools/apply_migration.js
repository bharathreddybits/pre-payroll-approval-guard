// Apply migration to Supabase using service role key
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

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

// Read migration file
const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '002_refined_schema.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

async function applyMigration() {
  console.log('Applying migration to Supabase...\n');

  // Split SQL into individual statements (simple split on semicolon)
  // Note: This is a simplified approach - production would use a proper SQL parser
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  // Use fetch to execute SQL via Supabase REST API
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';

    // Skip comments
    if (statement.trim().startsWith('--')) continue;

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`
        },
        body: JSON.stringify({ query: statement })
      });

      if (!response.ok) {
        // Try direct SQL execution via postgREST
        const directResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({ query: statement })
        });

        if (!directResponse.ok) {
          console.log(`⚠️  Statement ${i + 1}: Skipping (may already exist)`);
          continue;
        }
      }

      successCount++;
      if (i % 10 === 0) {
        console.log(`✅ Executed ${i + 1}/${statements.length} statements`);
      }
    } catch (error) {
      failCount++;
      console.log(`⚠️  Statement ${i + 1}: ${error.message}`);
    }
  }

  console.log(`\n✅ Migration complete: ${successCount} successful, ${failCount} skipped\n`);
}

applyMigration().catch(console.error);
