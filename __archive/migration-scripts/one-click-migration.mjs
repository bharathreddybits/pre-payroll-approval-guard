/**
 * One-Click Migration Script
 * Opens dashboard with pre-filled SQL ready to execute
 */

import { exec } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read migrations
const migration007 = readFileSync(join(__dirname, '..', 'supabase', 'migrations', '007_subscription_tracking.sql'), 'utf8');
const migration009 = readFileSync(join(__dirname, '..', 'supabase', 'migrations', '009_add_trial_tracking.sql'), 'utf8');

// Combine migrations
const combinedSQL = `-- MIGRATION 007: Create Subscription Table
${migration007}

-- MIGRATION 009: Add Trial Tracking
${migration009}`;

console.log('\n🚀 ONE-CLICK MIGRATION\n');
console.log('Opening Supabase SQL Editor...\n');

// Open dashboard
const dashboardUrl = 'https://supabase.com/dashboard/project/uzfohswazhvaphbpwtdv/sql/new';
exec(`start ${dashboardUrl}`);

console.log('✅ Dashboard opened!\n');
console.log('📋 SQL to execute (both migrations combined):\n');
console.log('═'.repeat(70));
console.log(combinedSQL);
console.log('═'.repeat(70));
console.log('\n');
console.log('⚡ QUICK STEPS:');
console.log('  1. Copy the SQL above (Ctrl+A, Ctrl+C)');
console.log('  2. Paste in the SQL Editor (Ctrl+V)');
console.log('  3. Click RUN (one button)');
console.log('  4. Done! ✅\n');

// Try clipboard (may not work on all systems)
try {
  exec(`echo "${combinedSQL.replace(/"/g, '\\"')}" | clip`, (err) => {
    if (!err) {
      console.log('💡 BONUS: SQL already in your clipboard! Just paste (Ctrl+V) and click RUN!\n');
    }
  });
} catch (e) {
  // Clipboard failed, no big deal
}
