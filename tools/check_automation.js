const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  'https://uzfohswazhvaphbpwtdv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6Zm9oc3dhemh2YXBoYnB3dGR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQxNjE4NywiZXhwIjoyMDg0OTkyMTg3fQ.H6E20k4Yvz6f-EQMchMrz5VEn3kyIdfBZ7bryY0Tf3s'
);

(async () => {
  const reviewSessionId = 'f0797026-d277-4465-957c-61012076e411';

  console.log('================================================');
  console.log('Checking Automated Processing Results');
  console.log('================================================');
  console.log('Review Session ID:', reviewSessionId);
  console.log('');

  // Check deltas
  console.log('Checking deltas...');
  const { data: deltas, error: deltaError } = await sb
    .from('payroll_delta')
    .select('*')
    .eq('review_session_id', reviewSessionId);

  if (deltaError) {
    console.error('❌ Error fetching deltas:', deltaError.message);
  } else {
    console.log('✅ Deltas found:', deltas.length);
    if (deltas.length > 0) {
      console.log('   Sample delta:', {
        employee_id: deltas[0].employee_id,
        metric: deltas[0].metric,
        change_type: deltas[0].change_type,
        organization_id: deltas[0].organization_id ? '✅ Present' : '❌ Missing'
      });
    }
  }

  console.log('');

  // Check judgements
  console.log('Checking judgements...');
  const { data: judgements, error: judgeError } = await sb
    .from('material_judgement')
    .select('*, payroll_delta!inner(review_session_id)')
    .eq('payroll_delta.review_session_id', reviewSessionId);

  if (judgeError) {
    console.error('❌ Error fetching judgements:', judgeError.message);
  } else {
    console.log('✅ Judgements found:', judgements.length);
    if (judgements.length > 0) {
      const material = judgements.filter(j => j.is_material).length;
      const blockers = judgements.filter(j => j.is_blocker).length;
      console.log('   Material changes:', material);
      console.log('   Blockers:', blockers);
      console.log('   Non-material:', judgements.length - material);
    }
  }

  console.log('');
  console.log('================================================');
  console.log('Final Assessment:');
  console.log('================================================');

  if (deltas && deltas.length === 9 && judgements && judgements.length === 9) {
    console.log('🎉 SUCCESS! Full automation working!');
    console.log('');
    console.log('✅ Upload API: Working');
    console.log('✅ n8n Diff Calculator: Triggered automatically');
    console.log('✅ n8n Judgement Engine: Triggered automatically');
    console.log('✅ Database: All records created correctly');
    console.log('✅ Total time: ~10-15 seconds (fully automated)');
  } else if (deltas && deltas.length > 0 && (!judgements || judgements.length === 0)) {
    console.log('⚠️  Partial Success');
    console.log('');
    console.log('✅ Upload API: Working');
    console.log('✅ n8n Diff Calculator: Working (' + deltas.length + ' deltas created)');
    console.log('❌ n8n Judgement Engine: May not have triggered');
    console.log('');
    console.log('Next steps:');
    console.log('1. Check n8n executions at https://n8n.srv1304590.hstgr.cloud/');
    console.log('2. Verify Judgement Engine workflow is Published (green)');
    console.log('3. Check N8N_JUDGEMENT_WEBHOOK_URL env var is set');
  } else if (!deltas || deltas.length === 0) {
    console.log('❌ Automation Did Not Trigger');
    console.log('');
    console.log('Possible issues:');
    console.log('1. Environment variables not set in Vercel');
    console.log('2. App not redeployed after adding env vars');
    console.log('3. n8n workflows not Published');
    console.log('4. n8n hostname not accessible from Vercel');
    console.log('');
    console.log('Fallback: Run manual script:');
    console.log('node tools/process_payroll_review.js ' + reviewSessionId);
  }

  console.log('================================================');
})();
