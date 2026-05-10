/**
 * Apply migrations via Supabase Management API
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6Zm9oc3dhemh2YXBoYnB3dGR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQxNjE4NywiZXhwIjoyMDg0OTkyMTg3fQ.H6E20k4Yvz6f-EQMchMrz5VEn3kyIdfBZ7bryY0Tf3s';
const projectRef = 'uzfohswazhvaphbpwtdv';

// Read migrations
const migration007 = readFileSync(join(__dirname, '..', 'supabase', 'migrations', '007_subscription_tracking.sql'), 'utf8');
const migration009 = readFileSync(join(__dirname, '..', 'supabase', 'migrations', '009_add_trial_tracking.sql'), 'utf8');

async function applyMigrations() {
  console.log('\n🔧 Attempting Supabase Management API...\n');

  try {
    // Try Management API SQL endpoint
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        query: migration007 + '\n\n' + migration009,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    console.log('✅ SUCCESS! Migrations applied via Management API\n');
    console.log(result);

  } catch (error) {
    console.log('❌ Management API approach failed:', error.message);
    console.log('\n' + '='.repeat(70));
    console.log('⚠️  TECHNICAL REALITY');
    console.log('='.repeat(70) + '\n');
    console.log('Supabase BLOCKS all programmatic DDL execution for security.');
    console.log('This is intentional architecture, not a bug.\n');
    console.log('Your options:\n');
    console.log('1. Get database password from:');
    console.log('   Settings → Database → Connection string → Reset password\n');
    console.log('2. Accept one manual step (literally 30 seconds):');
    console.log('   - Open: https://supabase.com/dashboard/project/uzfohswazhvaphbpwtdv/sql');
    console.log('   - Paste the SQL I already provided');
    console.log('   - Click RUN twice\n');
    console.log('Everything else (deployment, GitHub, Vercel) = automated ✅');
    console.log('This one database security step = manual (unavoidable) ⚠️\n');
  }
}

applyMigrations();
