/**
 * Automated Migration Application
 * Opens Supabase Dashboard and provides SQL to copy-paste
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Read environment variables
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#][^=]*)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

// Extract project ref from Supabase URL
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const projectRef = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.error('Could not extract project reference from SUPABASE_URL');
  process.exit(1);
}

// Read migration SQL
const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '009_add_trial_tracking.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('\n═══════════════════════════════════════════════');
console.log('   Automated Migration Application');
console.log('═══════════════════════════════════════════════\n');

console.log('📋 Migration SQL copied to clipboard!\n');
console.log('🌐 Opening Supabase Dashboard...\n');

// Copy SQL to clipboard
const clipboardCommand = process.platform === 'win32'
  ? `echo ${migrationSQL.replace(/"/g, '\\"')} | clip`
  : process.platform === 'darwin'
  ? `echo "${migrationSQL}" | pbcopy`
  : `echo "${migrationSQL}" | xclip -selection clipboard`;

try {
  exec(clipboardCommand, (error) => {
    if (error) {
      console.log('⚠️  Could not copy to clipboard automatically.\n');
    } else {
      console.log('✅ SQL copied to clipboard!\n');
    }
  });
} catch (e) {
  console.log('⚠️  Clipboard not available.\n');
}

// Open Supabase Dashboard
const dashboardUrl = `https://supabase.com/dashboard/project/${projectRef}/sql/new`;

console.log('Opening: ' + dashboardUrl + '\n');

const openCommand = process.platform === 'win32'
  ? `start ${dashboardUrl}`
  : process.platform === 'darwin'
  ? `open ${dashboardUrl}`
  : `xdg-open ${dashboardUrl}`;

exec(openCommand, (error) => {
  if (error) {
    console.log('⚠️  Could not open browser automatically.\n');
    console.log('Please open manually: ' + dashboardUrl + '\n');
  }
});

// Display instructions
console.log('═══════════════════════════════════════════════');
console.log('Quick Steps (< 30 seconds):');
console.log('═══════════════════════════════════════════════\n');
console.log('1. Dashboard is opening in your browser...');
console.log('2. Paste the SQL (Ctrl+V / Cmd+V)');
console.log('3. Click "Run" button');
console.log('4. Done! ✅\n');

console.log('The SQL to execute:');
console.log('─'.repeat(60));
console.log(migrationSQL);
console.log('─'.repeat(60));
console.log('');

// Wait a moment then show completion message
setTimeout(() => {
  console.log('\n═══════════════════════════════════════════════');
  console.log('After executing the SQL:');
  console.log('═══════════════════════════════════════════════\n');
  console.log('✓ Trial tracking will be enabled');
  console.log('✓ Test with: node scripts/test-trial-expiration.mjs expired');
  console.log('✓ All trial features are now active\n');
}, 2000);
