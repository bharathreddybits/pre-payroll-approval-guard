/**
 * Fix Organizations for Existing Users
 * Uses Supabase client to create organizations
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
const envPath = join(__dirname, '..', '.env');
const envContent = readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#][^=]*)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('\n❌ Missing Supabase credentials in .env\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('\n═══════════════════════════════════════════════');
console.log('   Organization Fix for Existing Users');
console.log('═══════════════════════════════════════════════\n');

async function main() {
  try {
    // Get all users from auth.users
    console.log('1. Fetching users...');
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) throw usersError;

    console.log(`   Found ${users.length} user(s)\n`);

    // Get existing mappings
    console.log('2. Checking existing organizations...');
    const { data: mappings, error: mappingsError } = await supabase
      .from('user_organization_mapping')
      .select('user_id');

    if (mappingsError) throw mappingsError;

    const mappedUserIds = new Set(mappings.map(m => m.user_id));

    // Find users without organizations
    const usersWithoutOrg = users.filter(u => !mappedUserIds.has(u.id));

    if (usersWithoutOrg.length === 0) {
      console.log('   ✓ All users already have organizations!\n');
      console.log('✅ No action needed.\n');
      return;
    }

    console.log(`   Found ${usersWithoutOrg.length} user(s) without organizations\n`);

    // Create organizations
    console.log('3. Creating organizations...\n');

    for (const user of usersWithoutOrg) {
      const orgName = (user.email?.split('@')[0] || 'User') + "'s Organization";

      console.log(`   Processing: ${user.email}`);

      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organization')
        .insert({ organization_name: orgName })
        .select()
        .single();

      if (orgError) {
        console.error(`   ✗ Failed to create org: ${orgError.message}`);
        continue;
      }

      // Link user to organization
      const { error: mappingError } = await supabase
        .from('user_organization_mapping')
        .insert({
          user_id: user.id,
          organization_id: org.organization_id,
          role: 'admin'
        });

      if (mappingError) {
        console.error(`   ✗ Failed to link user: ${mappingError.message}`);
        continue;
      }

      console.log(`   ✓ Created: ${orgName}`);
    }

    console.log('\n═══════════════════════════════════════════════');
    console.log(`✅ Success! Fixed ${usersWithoutOrg.length} user(s)`);
    console.log('═══════════════════════════════════════════════\n');
    console.log('All users can now subscribe!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
