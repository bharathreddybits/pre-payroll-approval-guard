/**
 * Vercel Environment Variables Setup Script
 *
 * Generates commands to set environment variables in Vercel
 * Can also automatically set them if Vercel CLI is installed
 *
 * Usage:
 *   node scripts/setup-vercel-env.js          # Show commands
 *   node scripts/setup-vercel-env.js --auto   # Auto-configure (requires vercel CLI)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const AUTO_MODE = process.argv.includes('--auto');

// Read .env.local file
const envPath = path.join(__dirname, '..', '.env.local');

if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found!');
  console.error('   Please create .env.local file first.');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');

// Parse environment variables
const envVars = {};
envContent.split('\n').forEach(line => {
  line = line.trim();
  if (line && !line.startsWith('#') && line.includes('=')) {
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=').trim();
    if (value && !value.includes('your-') && !value.includes('will-be-set')) {
      envVars[key] = value;
    }
  }
});

const requiredVars = [
  'LEMONSQUEEZY_API_KEY',
  'LEMONSQUEEZY_STORE_ID',
  'LEMONSQUEEZY_WEBHOOK_SECRET'
];

console.log('\n═══════════════════════════════════════════════════');
console.log('   Vercel Environment Variables Setup');
console.log('═══════════════════════════════════════════════════\n');

// Check if all required vars are present
const missingVars = requiredVars.filter(v => !envVars[v]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(v => console.error(`   - ${v}`));
  console.error('\nPlease configure these in .env.local first.\n');
  process.exit(1);
}

console.log('Found environment variables:');
requiredVars.forEach(v => {
  const value = envVars[v];
  const masked = value.length > 20 ? `${value.substring(0, 10)}...${value.substring(value.length - 10)}` : value;
  console.log(`  ✓ ${v} = ${masked}`);
});
console.log('');

if (AUTO_MODE) {
  console.log('🤖 AUTO MODE: Attempting to configure Vercel...\n');

  try {
    // Check if vercel CLI is installed
    execSync('vercel --version', { stdio: 'ignore' });
  } catch {
    console.error('❌ Vercel CLI not installed!');
    console.error('   Install with: npm i -g vercel');
    console.error('   Then run: vercel login\n');
    process.exit(1);
  }

  // Set each environment variable
  console.log('Setting environment variables in Vercel...\n');
  let success = 0;
  let failed = 0;

  requiredVars.forEach(varName => {
    try {
      const value = envVars[varName];
      console.log(`Setting ${varName}...`);

      // Set for production, preview, and development
      execSync(`vercel env add ${varName} production --force`, {
        input: value,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      console.log(`  ✓ ${varName} set for production`);
      success++;
    } catch (error) {
      console.error(`  ✗ Failed to set ${varName}`);
      console.error(`    ${error.message}`);
      failed++;
    }
  });

  console.log('');
  if (failed === 0) {
    console.log('✅ All environment variables configured successfully!\n');
    console.log('Next steps:');
    console.log('  1. Run: vercel --prod');
    console.log('  2. Or push to GitHub for auto-deployment\n');
  } else {
    console.log(`⚠️  ${success} succeeded, ${failed} failed\n`);
  }

} else {
  console.log('═══════════════════════════════════════════════════');
  console.log('   Manual Setup Instructions');
  console.log('═══════════════════════════════════════════════════\n');

  console.log('Option 1: Using Vercel Dashboard');
  console.log('─────────────────────────────────────────────────\n');
  console.log('1. Go to: https://vercel.com/your-project/settings/environment-variables\n');
  console.log('2. Add each variable below:\n');

  requiredVars.forEach(varName => {
    console.log(`   Name:  ${varName}`);
    console.log(`   Value: ${envVars[varName]}`);
    console.log(`   Scope: Production, Preview, Development`);
    console.log('');
  });

  console.log('\nOption 2: Using Vercel CLI');
  console.log('─────────────────────────────────────────────────\n');
  console.log('Run these commands:\n');

  requiredVars.forEach(varName => {
    console.log(`echo "${envVars[varName]}" | vercel env add ${varName} production`);
  });

  console.log('\n\nOption 3: Automatic Setup');
  console.log('─────────────────────────────────────────────────\n');
  console.log('Install Vercel CLI and run this script in auto mode:\n');
  console.log('  npm i -g vercel');
  console.log('  vercel login');
  console.log('  node scripts/setup-vercel-env.js --auto\n');

  console.log('═══════════════════════════════════════════════════');
  console.log('⚠️  IMPORTANT: These are TEST MODE credentials');
  console.log('═══════════════════════════════════════════════════');
  console.log('When ready for production:');
  console.log('  1. Disable test mode in LemonSqueezy');
  console.log('  2. Generate new production API key');
  console.log('  3. Update environment variables');
  console.log('  4. Recreate webhook for production\n');
}
