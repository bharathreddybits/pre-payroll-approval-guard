# Final Setup Steps

I need you to run these commands to complete the setup:

## Step 1: Add Environment Variables

Open PowerShell or Command Prompt and run:

```powershell
cd C:\Users\bhara\OneDrive\Desktop\PPG

# Add first webhook URL
echo https://n8n.srv1304590.hstgr.cloud/webhook/ppg-diff-calculator | npx vercel env add N8N_DIFF_WEBHOOK_URL production

# Add second webhook URL
echo https://n8n.srv1304590.hstgr.cloud/webhook/ppg-judgement-engine | npx vercel env add N8N_JUDGEMENT_WEBHOOK_URL production
```

## Step 2: Redeploy

```powershell
npx vercel --prod --yes
```

## Step 3: Test

After deployment completes (1-2 minutes), test the automation:

```powershell
curl -X POST https://payrollshield.cloud/api/upload `
  -F "baseline=@C:\Users\bhara\AppData\Local\Temp\claude\c--Users-bhara-OneDrive-Desktop-PPG\2a9fc2fb-4f0f-4e39-8ec6-0c8b0136ceeb\scratchpad\baseline_payroll.csv" `
  -F "current=@C:\Users\bhara\AppData\Local\Temp\claude\c--Users-bhara-OneDrive-Desktop-PPG\2a9fc2fb-4f0f-4e39-8ec6-0c8b0136ceeb\scratchpad\current_payroll.csv" `
  -F "organizationId=d3048d6c-19b0-4c01-8514-44e9e07f6d04" `
  -F "periodStartDate=2026-02-01" `
  -F "periodEndDate=2026-02-15" `
  -F "payDate=2026-02-20" `
  -F "runType=regular"
```

Wait 10-15 seconds, then check results:

```powershell
cd C:\Users\bhara\OneDrive\Desktop\PPG
node tools/check_automation.js
```

Expected: 9 deltas + 9 judgements created automatically!

---

**Alternatively, use the setup script I created:**

```powershell
cd C:\Users\bhara\OneDrive\Desktop\PPG
.\setup_vercel_env.bat
```

This will do all steps automatically.
