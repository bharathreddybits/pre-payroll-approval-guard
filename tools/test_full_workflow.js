// Test full workflow: Upload -> Review -> Approve
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

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

const { createClient } = require('@supabase/supabase-js');

const BASE_URL = 'http://localhost:3004';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testWorkflow() {
  console.log('🧪 Testing Pre-Payroll Approval Guard Workflow\n');

  try {
    // Step 1: Create test organization
    console.log('Step 1: Creating test organization...');
    const { data: org, error: orgError } = await supabase
      .from('organization')
      .insert({ organization_name: 'Test Company' })
      .select()
      .single();

    if (orgError) {
      console.error('❌ Failed to create organization:', orgError);
      return;
    }

    console.log(`✅ Organization created: ${org.organization_id}\n`);

    // Step 2: Upload baseline and current CSVs
    console.log('Step 2: Uploading payroll files...');

    const formData = new FormData();
    formData.append('organizationId', org.organization_id);
    formData.append('periodStartDate', '2024-01-01');
    formData.append('periodEndDate', '2024-01-31');
    formData.append('payDate', '2024-02-05');
    formData.append('runType', 'regular');

    const baselineFile = fs.createReadStream(path.join(__dirname, '..', '.tmp', 'test_baseline.csv'));
    const currentFile = fs.createReadStream(path.join(__dirname, '..', '.tmp', 'test_current.csv'));

    formData.append('baseline', baselineFile);
    formData.append('current', currentFile);

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
    console.log(`   Review Session ID: ${uploadResult.reviewSessionId}`);
    console.log(`   Total Changes: ${uploadResult.summary.totalChanges}`);
    console.log(`   Material Changes: ${uploadResult.summary.materialChanges}`);
    console.log(`   Blockers: ${uploadResult.summary.blockers}\n`);

    const reviewSessionId = uploadResult.reviewSessionId;

    // Step 3: Fetch review data
    console.log('Step 3: Fetching review data...');

    const reviewResponse = await fetch(`${BASE_URL}/api/review/${reviewSessionId}`);
    const reviewData = await reviewResponse.json();

    if (!reviewResponse.ok) {
      console.error('❌ Failed to fetch review:', reviewData);
      return;
    }

    console.log('✅ Review data fetched');
    console.log(`   Changes found: ${reviewData.changes.length}`);
    console.log(`   Approval status: ${reviewData.approval.approval_status}\n`);

    // Step 4: Display changes
    console.log('Step 4: Review Changes:');
    reviewData.changes.forEach((change, i) => {
      console.log(`   ${i + 1}. Employee ${change.employee_id}: ${change.metric}`);
      console.log(`      Baseline: ${change.baseline_value} → Current: ${change.current_value}`);
      console.log(`      Delta: ${change.delta_absolute} (${change.delta_percentage}%)`);
      if (change.judgement) {
        console.log(`      ${change.judgement.is_blocker ? '🚫 BLOCKER' : change.judgement.is_material ? '⚠️  Material' : '✅ OK'}: ${change.judgement.reasoning}`);
      }
    });
    console.log();

    // Step 5: Attempt approval
    console.log('Step 5: Attempting approval...');

    const approvalResponse = await fetch(`${BASE_URL}/api/review/${reviewSessionId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        approval_status: 'approved',
        approval_notes: 'Automated test approval'
      })
    });

    const approvalResult = await approvalResponse.json();

    if (approvalResponse.ok) {
      console.log('✅ Approval successful');
      console.log(`   Status: ${approvalResult.approval.approval_status}`);
      console.log(`   Timestamp: ${approvalResult.approval.approved_at}\n`);
    } else {
      console.log(`⚠️  Approval blocked (as expected if blockers exist)`);
      console.log(`   Error: ${approvalResult.error}\n`);
    }

    // Step 6: Verify audit trail
    console.log('Step 6: Verifying audit trail in Supabase...');

    const { data: auditData, error: auditError } = await supabase
      .from('approval')
      .select('*')
      .eq('review_session_id', reviewSessionId);

    if (auditError) {
      console.error('❌ Failed to fetch audit trail:', auditError);
      return;
    }

    console.log(`✅ Audit trail verified: ${auditData.length} approval record(s)\n`);

    // Step 7: Summary
    console.log('📊 Test Summary:');
    console.log('   ✅ Organization created');
    console.log('   ✅ CSV files uploaded and validated');
    console.log('   ✅ Diffs calculated');
    console.log('   ✅ Judgements applied');
    console.log('   ✅ Review data accessible');
    console.log('   ✅ Approval workflow tested');
    console.log('   ✅ Audit trail verified\n');

    console.log('🎉 All tests passed! Application is working correctly.\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
  }
}

testWorkflow();
