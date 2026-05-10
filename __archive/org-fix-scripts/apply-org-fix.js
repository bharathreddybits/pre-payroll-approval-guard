/**
 * Automated Organization Fix
 *
 * Applies the organization creation fix via Supabase API
 * Runs the fix-existing-users.sql via REST API
 */

require('dotenv').config({ path: '.env.local' });
const https = require('https');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('\n❌ Supabase credentials not found in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY\n');
  process.exit(1);
}

const SUPABASE_HOST = SUPABASE_URL.replace('https://', '').replace('http://', '');

// The SQL to execute
const FIX_SQL = `
DO $$
DECLARE
  user_record RECORD;
  new_org_id UUID;
  org_name TEXT;
  users_fixed INTEGER := 0;
BEGIN
  FOR user_record IN
    SELECT u.id, u.email
    FROM auth.users u
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.user_organization_mapping uom
      WHERE uom.user_id = u.id
    )
  LOOP
    org_name := SPLIT_PART(user_record.email, '@', 1) || '''s Organization';

    INSERT INTO public.organization (organization_name)
    VALUES (org_name)
    RETURNING organization_id INTO new_org_id;

    INSERT INTO public.user_organization_mapping (user_id, organization_id, role)
    VALUES (user_record.id, new_org_id, 'admin');

    users_fixed := users_fixed + 1;
  END LOOP;

  RAISE NOTICE 'Fixed % user(s)', users_fixed;
END $$;
`.trim();

function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query: sql });

    const options = {
      hostname: SUPABASE_HOST,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('\n═══════════════════════════════════════════════');
  console.log('   Automated Organization Fix');
  console.log('═══════════════════════════════════════════════\n');

  console.log('Connecting to Supabase...');
  console.log(`URL: ${SUPABASE_URL}\n`);

  try {
    console.log('Applying fix for existing users without organizations...\n');

    await executeSQL(FIX_SQL);

    console.log('✅ Success! Organization fix applied.\n');
    console.log('All users now have organizations and can subscribe.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFalling back to manual SQL execution...');
    console.error('Please run the SQL in Supabase Dashboard:\n');
    console.error(FIX_SQL);
    console.error('\n');
    process.exit(1);
  }
}

main();
