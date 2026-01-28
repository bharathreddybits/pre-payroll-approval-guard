// Test Supabase connection and verify schema
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env file manually
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase connection...\n');
  console.log('URL:', supabaseUrl);
  console.log('Key:', supabaseKey.substring(0, 20) + '...\n');

  try {
    // Test 1: Check if organization table exists
    console.log('Test 1: Checking organization table...');
    const { data: orgData, error: orgError } = await supabase
      .from('organization')
      .select('*')
      .limit(1);

    if (orgError) {
      if (orgError.code === '42P01') {
        console.log('❌ Table "organization" does not exist');
        console.log('   → You need to run the migration: supabase/migrations/002_refined_schema.sql\n');
        return false;
      }
      throw orgError;
    }
    console.log('✅ Table "organization" exists');
    console.log('   Current records:', orgData?.length || 0, '\n');

    // Test 2: Check if review_session table exists
    console.log('Test 2: Checking review_session table...');
    const { data: sessionData, error: sessionError } = await supabase
      .from('review_session')
      .select('*')
      .limit(1);

    if (sessionError) throw sessionError;
    console.log('✅ Table "review_session" exists');
    console.log('   Current records:', sessionData?.length || 0, '\n');

    // Test 3: Check if payroll_delta table exists
    console.log('Test 3: Checking payroll_delta table...');
    const { data: deltaData, error: deltaError } = await supabase
      .from('payroll_delta')
      .select('*')
      .limit(1);

    if (deltaError) throw deltaError;
    console.log('✅ Table "payroll_delta" exists');
    console.log('   Current records:', deltaData?.length || 0, '\n');

    // Test 4: Check if material_judgement table exists
    console.log('Test 4: Checking material_judgement table...');
    const { data: judgementData, error: judgementError } = await supabase
      .from('material_judgement')
      .select('*')
      .limit(1);

    if (judgementError) throw judgementError;
    console.log('✅ Table "material_judgement" exists');
    console.log('   Current records:', judgementData?.length || 0, '\n');

    console.log('✅ All schema checks passed!');
    console.log('✅ Supabase connection is working correctly\n');
    return true;

  } catch (error) {
    console.error('❌ Connection test failed:');
    console.error('Error:', error.message);
    console.error('Details:', error);
    return false;
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});
