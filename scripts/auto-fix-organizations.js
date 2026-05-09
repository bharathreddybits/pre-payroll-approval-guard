/**
 * Automated Organization Fix via Supabase REST API
 *
 * Creates organizations for all users who don't have one
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Read .env file
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#][^=]*)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_HOST = SUPABASE_URL.replace('https://', '');

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SUPABASE_HOST,
      path,
      method,
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          const parsed = responseData ? JSON.parse(responseData) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({});
          } else {
            reject(new Error(`Failed: ${responseData}`));
          }
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  console.log('\n═══════════════════════════════════════════════');
  console.log('   Automated Organization Fix');
  console.log('═══════════════════════════════════════════════\n');

  try {
    // Get all users
    console.log('1. Fetching all users...');
    const users = await makeRequest('GET', '/rest/v1/rpc/get_users');

    // For each user, check if they have an organization
    console.log(`   Found ${users ? users.length : 0} users\n`);

    // Get all user-organization mappings
    console.log('2. Checking existing organizations...');
    const mappings = await makeRequest('GET', '/rest/v1/user_organization_mapping?select=user_id');
    const mappedUserIds = new Set(mappings.map(m => m.user_id));

    // Find users without organizations
    const usersWithoutOrg = users ? users.filter(u => !mappedUserIds.has(u.id)) : [];

    if (usersWithoutOrg.length === 0) {
      console.log('   ✓ All users already have organizations!\n');
      return;
    }

    console.log(`   Found ${usersWithoutOrg.length} users without organizations\n`);

    // Create organizations for each user
    console.log('3. Creating organizations...\n');
    for (const user of usersWithoutOrg) {
      const orgName = (user.email.split('@')[0] || 'User') + "'s Organization";

      console.log(`   Creating org for: ${user.email}`);

      // Create organization
      const org = await makeRequest('POST', '/rest/v1/organization', {
        organization_name: orgName
      });

      if (!org || org.length === 0) {
        throw new Error(`Failed to create org for ${user.email}`);
      }

      // Link user to organization
      await makeRequest('POST', '/rest/v1/user_organization_mapping', {
        user_id: user.id,
        organization_id: org[0].organization_id,
        role: 'admin'
      });

      console.log(`   ✓ Created: ${orgName}`);
    }

    console.log('\n═══════════════════════════════════════════════');
    console.log(`✅ Success! Fixed ${usersWithoutOrg.length} user(s)`);
    console.log('═══════════════════════════════════════════════\n');
    console.log('All users can now subscribe to plans!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nTrying alternative approach...\n');

    // Alternative: Direct table queries
    try {
      console.log('Fetching users from auth schema...');
      // This won't work via REST API, need to use SQL
      console.error('REST API approach failed. Please run the SQL script manually.\n');
      process.exit(1);
    } catch (e) {
      console.error('Alternative approach also failed.');
      console.error('\nPlease run this SQL in Supabase Dashboard:\n');
      console.error('See scripts/fix-existing-users.sql\n');
      process.exit(1);
    }
  }
}

main();
