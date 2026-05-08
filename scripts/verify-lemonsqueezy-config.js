/**
 * LemonSqueezy Configuration Verification Script
 *
 * Verifies that all LemonSqueezy configuration is correct before deployment
 *
 * Usage: node scripts/verify-lemonsqueezy-config.js
 */

const fs = require('fs');
const path = require('path');

// ANSI colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkMark() {
  return `${colors.green}✓${colors.reset}`;
}

function xMark() {
  return `${colors.red}✗${colors.reset}`;
}

function warningMark() {
  return `${colors.yellow}⚠${colors.reset}`;
}

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0
};

console.log('\n═══════════════════════════════════════════════════');
log('  LemonSqueezy Configuration Verification', 'cyan');
console.log('═══════════════════════════════════════════════════\n');

// Check 1: Verify plans.ts has variant IDs
console.log('1. Checking product variant configuration...');
try {
  const plansPath = path.join(__dirname, '..', 'lib', 'billing', 'plans.ts');
  const plansContent = fs.readFileSync(plansPath, 'utf8');

  const variantIds = ['1624079', '1624164', '1624168', '1624171'];
  const allVariantsFound = variantIds.every(id => plansContent.includes(id));

  if (allVariantsFound) {
    log(`   ${checkMark()} All 4 variant IDs configured`, 'green');
    checks.passed++;
  } else {
    log(`   ${xMark()} Missing variant IDs in plans.ts`, 'red');
    checks.failed++;
  }

  if (plansContent.includes('LEMONSQUEEZY_VARIANT_TO_PLAN')) {
    log(`   ${checkMark()} Variant mapping configured`, 'green');
    checks.passed++;
  } else {
    log(`   ${xMark()} Variant mapping missing`, 'red');
    checks.failed++;
  }
} catch (error) {
  log(`   ${xMark()} Error reading plans.ts: ${error.message}`, 'red');
  checks.failed += 2;
}

// Check 2: Verify .env.local exists and has required variables
console.log('\n2. Checking environment configuration...');
try {
  const envPath = path.join(__dirname, '..', '.env.local');

  if (fs.existsSync(envPath)) {
    log(`   ${checkMark()} .env.local file exists`, 'green');
    checks.passed++;

    const envContent = fs.readFileSync(envPath, 'utf8');
    const requiredVars = [
      'LEMONSQUEEZY_API_KEY',
      'LEMONSQUEEZY_STORE_ID',
      'LEMONSQUEEZY_WEBHOOK_SECRET'
    ];

    requiredVars.forEach(varName => {
      if (envContent.includes(`${varName}=`) && !envContent.includes(`${varName}=your-`) && !envContent.includes(`${varName}=will-be-set`)) {
        log(`   ${checkMark()} ${varName} is set`, 'green');
        checks.passed++;
      } else {
        log(`   ${xMark()} ${varName} is missing or not configured`, 'red');
        checks.failed++;
      }
    });

    if (envContent.includes('TEST MODE')) {
      log(`   ${warningMark()} Running in TEST MODE`, 'yellow');
      checks.warnings++;
    }
  } else {
    log(`   ${xMark()} .env.local file not found`, 'red');
    checks.failed++;
  }
} catch (error) {
  log(`   ${xMark()} Error reading .env.local: ${error.message}`, 'red');
  checks.failed++;
}

// Check 3: Verify API endpoints exist
console.log('\n3. Checking API endpoints...');
const apiEndpoints = [
  'pages/api/checkout/create.ts',
  'pages/api/webhooks/lemonsqueezy.ts',
  'pages/api/subscription/cancel.ts',
  'pages/api/subscription/resume.ts'
];

apiEndpoints.forEach(endpoint => {
  const endpointPath = path.join(__dirname, '..', endpoint);
  if (fs.existsSync(endpointPath)) {
    log(`   ${checkMark()} ${endpoint}`, 'green');
    checks.passed++;
  } else {
    log(`   ${xMark()} ${endpoint} not found`, 'red');
    checks.failed++;
  }
});

// Check 4: Verify UI pages exist
console.log('\n4. Checking UI pages...');
const uiPages = [
  'pages/pricing.tsx',
  'pages/subscription.tsx'
];

uiPages.forEach(page => {
  const pagePath = path.join(__dirname, '..', page);
  if (fs.existsSync(pagePath)) {
    log(`   ${checkMark()} ${page}`, 'green');
    checks.passed++;
  } else {
    log(`   ${xMark()} ${page} not found`, 'red');
    checks.failed++;
  }
});

// Check 5: Verify database migration exists
console.log('\n5. Checking database migration...');
const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '007_subscription_tracking.sql');
if (fs.existsSync(migrationPath)) {
  log(`   ${checkMark()} Subscription tracking migration exists`, 'green');
  checks.passed++;

  const migrationContent = fs.readFileSync(migrationPath, 'utf8');
  if (migrationContent.includes('CREATE TABLE IF NOT EXISTS public.subscription')) {
    log(`   ${checkMark()} Subscription table definition found`, 'green');
    checks.passed++;
  }
} else {
  log(`   ${xMark()} Migration file not found`, 'red');
  checks.failed++;
}

// Check 6: Verify lemonsqueezy.ts implementation
console.log('\n6. Checking LemonSqueezy integration...');
const lsPath = path.join(__dirname, '..', 'lib', 'billing', 'lemonsqueezy.ts');
if (fs.existsSync(lsPath)) {
  log(`   ${checkMark()} lemonsqueezy.ts exists`, 'green');
  checks.passed++;

  const lsContent = fs.readFileSync(lsPath, 'utf8');
  const requiredFunctions = [
    'createCheckoutSession',
    'cancelLemonSqueezySubscription',
    'resumeLemonSqueezySubscription',
    'verifyWebhookSignature'
  ];

  requiredFunctions.forEach(fn => {
    if (lsContent.includes(fn)) {
      log(`   ${checkMark()} ${fn} implemented`, 'green');
      checks.passed++;
    } else {
      log(`   ${xMark()} ${fn} missing`, 'red');
      checks.failed++;
    }
  });
} else {
  log(`   ${xMark()} lemonsqueezy.ts not found`, 'red');
  checks.failed++;
}

// Summary
console.log('\n═══════════════════════════════════════════════════');
log('  Verification Summary', 'cyan');
console.log('═══════════════════════════════════════════════════\n');

log(`✓ Passed:   ${checks.passed}`, 'green');
if (checks.failed > 0) {
  log(`✗ Failed:   ${checks.failed}`, 'red');
}
if (checks.warnings > 0) {
  log(`⚠ Warnings: ${checks.warnings}`, 'yellow');
}

console.log('\n');

if (checks.failed === 0) {
  log('🎉 All checks passed! Your LemonSqueezy integration is ready.', 'green');
  console.log('\nNext steps:');
  console.log('  1. Run database migration: supabase db push');
  console.log('  2. Add environment variables to Vercel');
  console.log('  3. Test the integration in development');
  console.log('  4. Deploy to production\n');
  process.exit(0);
} else {
  log('❌ Some checks failed. Please fix the issues above.', 'red');
  console.log('\n');
  process.exit(1);
}
