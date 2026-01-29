@echo off
echo ================================================
echo Setting up Vercel Environment Variables
echo ================================================
echo.
echo This will add the n8n webhook URLs to your Vercel production environment.
echo.
echo Press any key to continue...
pause >nul
echo.

cd /d C:\Users\bhara\OneDrive\Desktop\PPG

echo Adding N8N_DIFF_WEBHOOK_URL...
echo https://n8n.srv1304590.hstgr.cloud/webhook/ppg-diff-calculator | npx vercel env add N8N_DIFF_WEBHOOK_URL production

echo.
echo Adding N8N_JUDGEMENT_WEBHOOK_URL...
echo https://n8n.srv1304590.hstgr.cloud/webhook/ppg-judgement-engine | npx vercel env add N8N_JUDGEMENT_WEBHOOK_URL production

echo.
echo ================================================
echo Environment variables added successfully!
echo ================================================
echo.
echo Now redeploying to production...
echo.
npx vercel --prod --yes

echo.
echo ================================================
echo Setup complete!
echo ================================================
echo.
echo Your app has been redeployed with the new environment variables.
echo The webhooks should now trigger automatically on CSV upload.
echo.
pause
