/**
 * Test Trial Expiration Flow
 *
 * This script creates test subscriptions with different trial states
 * to test the trial expiration notification and access control flow.
 *
 * Usage:
 *   node scripts/test-trial-expiration.mjs <scenario>
 *
 * Scenarios:
 *   expired      - Create subscription with expired trial
 *   expiring     - Create subscription expiring in 2 days
 *   active       - Create active subscription (no trial)
 *   new-trial    - Create new trial (7 days remaining)
 *   reset        - Remove test subscription
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env
const envPath = join(__dirname, '..', '.env');
const envContent = readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#][^=]*)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const scenario = process.argv[2];

if (!scenario) {
  console.error('\n❌ Error: Please specify a scenario\n');
  console.error('Usage: node scripts/test-trial-expiration.mjs <scenario>\n');
  console.error('Scenarios:');
  console.error('  expired      - Trial expired (blocks access)');
  console.error('  expiring     - Trial expiring in 2 days (shows warning)');
  console.error('  active       - Active subscription (no warnings)');
  console.error('  new-trial    - New trial - 7 days remaining');
  console.error('  reset        - Remove test subscription\n');
  process.exit(1);
}

console.log('\n═══════════════════════════════════════════════');
console.log('   Test Trial Expiration Flow');
console.log('═══════════════════════════════════════════════\n');

async function main() {
  try {
    // Get first user's organization
    console.log('1. Finding test organization...');
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) throw usersError;
    if (!users || users.length === 0) {
      throw new Error('No users found');
    }

    const testUser = users[0];
    console.log(`   Using user: ${testUser.email}\n`);

    // Get user's organization
    const { data: mapping, error: mappingError } = await supabase
      .from('user_organization_mapping')
      .select('organization_id')
      .eq('user_id', testUser.id)
      .single();

    if (mappingError || !mapping) {
      throw new Error('User has no organization');
    }

    const organizationId = mapping.organization_id;
    console.log(`   Organization ID: ${organizationId}\n`);

    // Reset scenario - remove subscription
    if (scenario === 'reset') {
      console.log('2. Removing test subscription...');
      const { error: deleteError } = await supabase
        .from('subscription')
        .delete()
        .eq('organization_id', organizationId);

      if (deleteError) throw deleteError;

      console.log('   ✓ Subscription removed\n');
      console.log('═══════════════════════════════════════════════');
      console.log('✅ Reset Complete');
      console.log('═══════════════════════════════════════════════\n');
      console.log('The organization now has no subscription.');
      console.log('User should see "Start Free Trial" banner.\n');
      return;
    }

    // Remove existing subscription first
    console.log('2. Removing existing subscription (if any)...');
    await supabase
      .from('subscription')
      .delete()
      .eq('organization_id', organizationId);

    console.log('   ✓ Cleaned up\n');

    // Create subscription based on scenario
    console.log('3. Creating test subscription...');

    let subscriptionData;
    const now = new Date();

    switch (scenario) {
      case 'expired':
        // Trial expired 1 day ago
        subscriptionData = {
          organization_id: organizationId,
          plan_id: 'starter_monthly',
          tier: 'starter',
          status: 'trialing',
          trial_end_date: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          trial_days: 7,
          current_period_start: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
          current_period_end: new Date(now.getTime() + 22 * 24 * 60 * 60 * 1000).toISOString(),
          cancel_at_period_end: false,
        };
        break;

      case 'expiring':
        // Trial expiring in 2 days
        subscriptionData = {
          organization_id: organizationId,
          plan_id: 'starter_monthly',
          tier: 'starter',
          status: 'trialing',
          trial_end_date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
          trial_days: 7,
          current_period_start: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          current_period_end: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000).toISOString(),
          cancel_at_period_end: false,
        };
        break;

      case 'active':
        // Active subscription (no trial)
        subscriptionData = {
          organization_id: organizationId,
          plan_id: 'starter_monthly',
          tier: 'starter',
          status: 'active',
          trial_end_date: null,
          trial_days: null,
          current_period_start: now.toISOString(),
          current_period_end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          cancel_at_period_end: false,
          lemonsqueezy_subscription_id: 'test_sub_' + Date.now(),
        };
        break;

      case 'new-trial':
        // New trial - 7 days remaining
        subscriptionData = {
          organization_id: organizationId,
          plan_id: 'starter_monthly',
          tier: 'starter',
          status: 'trialing',
          trial_end_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          trial_days: 7,
          current_period_start: now.toISOString(),
          current_period_end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancel_at_period_end: false,
        };
        break;

      default:
        throw new Error(`Unknown scenario: ${scenario}`);
    }

    const { data: newSub, error: createError } = await supabase
      .from('subscription')
      .insert(subscriptionData)
      .select()
      .single();

    if (createError) throw createError;

    console.log(`   ✓ Created ${scenario} subscription\n`);

    // Display results
    console.log('═══════════════════════════════════════════════');
    console.log('✅ Test Subscription Created');
    console.log('═══════════════════════════════════════════════\n');

    console.log('Subscription Details:');
    console.log(`  Status: ${newSub.status}`);
    console.log(`  Plan: ${newSub.plan_id}`);
    console.log(`  Tier: ${newSub.tier}`);
    if (newSub.trial_end_date) {
      const trialEnd = new Date(newSub.trial_end_date);
      const daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
      console.log(`  Trial Ends: ${trialEnd.toLocaleString()}`);
      console.log(`  Days Remaining: ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}`);
    }
    console.log('');

    console.log('Expected Behavior:');
    switch (scenario) {
      case 'expired':
        console.log('  🔴 Trial Expired Banner (Red)');
        console.log('  🚫 Access BLOCKED to protected pages');
        console.log('  📋 Shows "Subscribe Now" screen');
        break;
      case 'expiring':
        console.log('  🟡 Trial Expiring Soon Banner (Amber)');
        console.log('  ✅ Access granted');
        console.log('  ⚠️  Shows warning: "Trial ends in 2 days"');
        break;
      case 'active':
        console.log('  ✅ No banners (active subscription)');
        console.log('  ✅ Full access granted');
        console.log('  📊 Normal dashboard view');
        break;
      case 'new-trial':
        console.log('  🔵 No immediate banners (7 days remaining)');
        console.log('  ✅ Full access granted');
        console.log('  ℹ️  Banner appears when ≤3 days remain');
        break;
    }
    console.log('');

    console.log('Test Instructions:');
    console.log('  1. Log in as: ' + testUser.email);
    console.log('  2. Navigate to /dashboard');
    console.log('  3. Observe banner and access behavior');
    console.log('  4. Try accessing protected pages');
    console.log('');
    console.log('To reset: node scripts/test-trial-expiration.mjs reset\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
