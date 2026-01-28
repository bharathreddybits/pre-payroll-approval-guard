// Simple test: Upload CSVs and verify data
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

// Load .env
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

const BASE_URL = 'http://localhost:3004';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function test() {
  console.log('🧪 Testing Upload & Data Storage\n');

  try {
    // Create test organization
    console.log('Creating test organization...');
    const { data: org, error: orgError } = await supabase
      .from('organization')
      .insert({ organization_name: 'Test Company ' + Date.now() })
      .select()
      .single();

    if (orgError) {
      console.error('❌ Failed:', orgError);
      return;
    }

    console.log(`✅ Organization created: ${org.organization_id}\n`);

    // Upload CSVs
    console.log('Uploading CSVs...');

    const formData = new FormData();
    formData.append('organizationId', org.organization_id);
    formData.append('periodStartDate', '2024-01-01');
    formData.append('periodEndDate', '2024-01-31');
    formData.append('payDate', '2024-02-05');
    formData.append('runType', 'regular');

    formData.append('baseline', fs.createReadStream(path.join(__dirname, '..', '.tmp', 'test_baseline.csv')));
    formData.append('current', fs.createReadStream(path.join(__dirname, '..', '.tmp', 'test_current.csv')));

    const uploadResponse = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    const uploadResult = await uploadResponse.json();

    if (!uploadResponse.ok) {
      console.error('❌ Upload failed:', uploadResult);
      return;
    }

    console.log('✅ Upload successful');
    console.log(`   Review Session: ${uploadResult.review_session_id}`);
    console.log(`   Baseline rows: ${uploadResult.baseline_row_count}`);
    console.log(`   Current rows: ${uploadResult.current_row_count}\n`);

    const reviewSessionId = uploadResult.review_session_id;

    // Verify data in Supabase
    console.log('Verifying data in Supabase...\n');

    const { data: datasets, error: datasetError } = await supabase
      .from('payroll_dataset')
      .select('*')
      .eq('review_session_id', reviewSessionId);

    if (datasetError) {
      console.error('❌ Dataset query failed:', datasetError);
      return;
    }

    console.log(`✅ Datasets: ${datasets.length} (baseline + current)`);
    datasets.forEach(ds => {
      console.log(`   ${ds.dataset_type}: ${ds.row_count} rows`);
    });

    const { data: employees, error: empError } = await supabase
      .from('employee_pay_record')
      .select('*')
      .in('dataset_id', datasets.map(d => d.dataset_id));

    if (empError) {
      console.error('❌ Employee query failed:', empError);
      return;
    }

    console.log(`✅ Employee records: ${employees.length} total`);
    console.log(`   Sample: ${employees[0].employee_name} - $${employees[0].net_pay}\n`);

    console.log('📊 Summary:');
    console.log('   ✅ Organization created');
    console.log('   ✅ CSV upload successful');
    console.log('   ✅ Datasets created in Supabase');
    console.log('   ✅ Employee records stored\n');

    console.log('🎉 Upload test passed!\n');
    console.log(`Next: Run diff calculator with review session: ${reviewSessionId}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

test();
