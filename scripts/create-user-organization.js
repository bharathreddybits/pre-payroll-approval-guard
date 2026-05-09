/**
 * Create Organization for User
 *
 * This script creates an organization for a user who doesn't have one yet.
 * Useful for existing users created before the auto-organization trigger was added.
 *
 * Usage:
 *   node scripts/create-user-organization.js <user-email>
 *
 * Example:
 *   node scripts/create-user-organization.js user@example.com
 */

const https = require('https');
const crypto = require('crypto');

// Get user email from command line
const userEmail = process.argv[2];

if (!userEmail) {
  console.error('\n❌ Error: Please provide a user email\n');
  console.error('Usage: node scripts/create-user-organization.js <user-email>\n');
  console.error('Example: node scripts/create-user-organization.js user@example.com\n');
  process.exit(1);
}

// Supabase configuration (read from environment or use defaults)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('\n❌ Error: Supabase credentials not found\n');
  console.error('Please set the following environment variables:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY\n');
  console.error('Or add them to your .env.local file\n');
  process.exit(1);
}

const SUPABASE_HOST = SUPABASE_URL.replace('https://', '').replace('http://', '');

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SUPABASE_HOST,
      path: `/rest/v1${path}`,
      method: method,
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = responseData ? JSON.parse(responseData) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`API Error ${res.statusCode}: ${JSON.stringify(parsed)}`));
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({});
          } else {
            reject(new Error(`Failed to parse response: ${responseData}`));
          }
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('   Create Organization for User');
  console.log('═══════════════════════════════════════════════════\n');
  console.log(`User email: ${userEmail}\n`);

  try {
    // Step 1: Find user by email (using auth admin API)
    console.log('1. Looking up user...');

    // Get all users and find by email
    const authUsers = await makeRequest('GET', `/auth/v1/admin/users`);
    const user = authUsers.users?.find(u => u.email === userEmail);

    if (!user) {
      console.error(`\n❌ User not found with email: ${userEmail}\n`);
      console.error('Please check the email address and try again.\n');
      process.exit(1);
    }

    console.log(`   ✓ Found user: ${user.id}\n`);

    // Step 2: Check if user already has an organization
    console.log('2. Checking for existing organization...');
    const existingMapping = await makeRequest('GET', `/user_organization_mapping?user_id=eq.${user.id}`);

    if (existingMapping && existingMapping.length > 0) {
      console.log(`   ⚠ User already has an organization!\n`);

      const orgId = existingMapping[0].organization_id;
      const org = await makeRequest('GET', `/organization?organization_id=eq.${orgId}`);

      if (org && org.length > 0) {
        console.log(`   Organization: ${org[0].organization_name}`);
        console.log(`   ID: ${org[0].organization_id}`);
        console.log(`   Role: ${existingMapping[0].role}\n`);
      }

      console.log('No action needed. User is already set up.\n');
      return;
    }

    console.log(`   ✓ No existing organization found\n`);

    // Step 3: Create organization
    console.log('3. Creating organization...');
    const orgName = userEmail.split('@')[0] + "'s Organization";

    const newOrg = await makeRequest('POST', '/organization', {
      organization_name: orgName
    });

    if (!newOrg || newOrg.length === 0) {
      throw new Error('Failed to create organization');
    }

    const organizationId = newOrg[0].organization_id;
    console.log(`   ✓ Created: ${orgName}`);
    console.log(`   ID: ${organizationId}\n`);

    // Step 4: Link user to organization
    console.log('4. Linking user to organization...');
    await makeRequest('POST', '/user_organization_mapping', {
      user_id: user.id,
      organization_id: organizationId,
      role: 'admin'
    });

    console.log(`   ✓ User linked as admin\n`);

    // Success
    console.log('═══════════════════════════════════════════════════');
    console.log('✅ Success! Organization created and linked');
    console.log('═══════════════════════════════════════════════════\n');
    console.log('Details:');
    console.log(`  User: ${userEmail}`);
    console.log(`  Organization: ${orgName}`);
    console.log(`  ID: ${organizationId}`);
    console.log(`  Role: admin\n`);
    console.log('The user can now subscribe to a plan!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nPlease check:');
    console.error('  - Your Supabase credentials are correct');
    console.error('  - The user exists in the database');
    console.error('  - You have the necessary permissions\n');
    process.exit(1);
  }
}

main();
