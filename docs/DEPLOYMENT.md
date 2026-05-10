# PayrollShield Deployment Guide

Complete guide for deploying PayrollShield with LemonSqueezy billing integration.

## Prerequisites

- [x] LemonSqueezy account with test mode enabled
- [x] Supabase project set up
- [x] Vercel account connected to GitHub
- [x] GitHub repository configured

## Quick Start

### 1. Verify Configuration

Run the verification script to ensure everything is configured:

```bash
node scripts/verify-lemonsqueezy-config.js
```

Expected output: ✅ All checks passed!

### 2. Set Up Vercel Environment Variables

**Option A: Using the helper script**
```bash
node scripts/setup-vercel-env.js
```

This will display the exact values to add to Vercel.

**Option B: Manual setup via Vercel Dashboard**
1. Go to: https://vercel.com/your-project/settings/environment-variables
2. Add these variables (get values from `.env.local`):
   - `LEMONSQUEEZY_API_KEY`
   - `LEMONSQUEEZY_STORE_ID`
   - `LEMONSQUEEZY_WEBHOOK_SECRET`
3. Set scope to: Production, Preview, Development

### 3. Apply Database Migration

Run the Supabase migration to create the subscription table:

```bash
supabase db push
```

Or apply manually in Supabase Dashboard:
1. Go to SQL Editor
2. Open `supabase/migrations/007_subscription_tracking.sql`
3. Execute the migration

### 4. Deploy to Production

Push to GitHub or deploy via Vercel CLI:

```bash
# Via Git
git push origin master

# Or via Vercel CLI
vercel --prod
```

## Configuration Details

### LemonSqueezy Setup (Completed ✅)

**Store Information:**
- Store ID: `288054`
- Store URL: payrollshield.lemonsqueezy.com
- Mode: TEST MODE (for development)

**Products Created:**
- Starter Monthly (Variant: 1624079) - $249/mo
- Starter Annual (Variant: 1624164) - $199/mo
- Pro Monthly (Variant: 1624168) - $749/mo
- Pro Annual (Variant: 1624171) - $599/mo

**Webhook:**
- ID: 98184
- URL: https://payrollshield.cloud/api/webhooks/lemonsqueezy
- Secret: 7c58dbe3ec65656e161b19fd55b7c96ceb8c2225
- Events: subscription_created, subscription_updated, subscription_cancelled, subscription_resumed, payment_success, payment_failed

### Code Configuration (Completed ✅)

**Variant Mappings** (`lib/billing/plans.ts`):
```typescript
'1624079': 'starter_monthly',
'1624164': 'starter_annual',
'1624168': 'pro_monthly',
'1624171': 'pro_annual',
```

**API Endpoints:**
- `/api/checkout/create` - Create checkout sessions
- `/api/webhooks/lemonsqueezy` - Handle subscription webhooks
- `/api/subscription/cancel` - Cancel subscriptions
- `/api/subscription/resume` - Resume subscriptions

**UI Pages:**
- `/pricing` - View plans and subscribe
- `/subscription` - Manage subscription

## Testing the Integration

### Local Testing

1. **Start development server:**
   ```bash
   npm run dev
   ```

2. **Test subscription flow:**
   - Navigate to http://localhost:3001/pricing
   - Sign in with a test account
   - Click "Start 7-Day Free Trial"
   - Complete test checkout on LemonSqueezy
   - Verify webhook fires and creates subscription
   - Check http://localhost:3001/subscription

3. **Test webhook manually:**
   ```bash
   curl -X POST http://localhost:3001/api/webhooks/lemonsqueezy \
     -H "Content-Type: application/json" \
     -H "X-Signature: test" \
     -d '{"meta":{"event_name":"subscription_created"},"data":{}}'
   ```

### Production Testing

1. **Verify webhook delivery** in LemonSqueezy Dashboard:
   - Go to Settings → Webhooks
   - View webhook #98184
   - Check delivery logs

2. **Test checkout flow:**
   - Use LemonSqueezy test credit card: `4242 4242 4242 4242`
   - Complete a test subscription
   - Verify in Supabase that subscription record is created
   - Check subscription management page

3. **Test subscription management:**
   - Cancel a subscription
   - Resume a cancelled subscription
   - Verify status changes in database

## Switching to Production Mode

When ready to go live:

### 1. Disable Test Mode in LemonSqueezy
- Go to LemonSqueezy Dashboard → Settings
- Disable test mode

### 2. Generate Production API Key
- Create new API key for production
- Store securely

### 3. Recreate Webhook for Production
```bash
# Delete test webhook
node scripts/delete-lemonsqueezy-webhook.js

# Create production webhook (update API key in script first)
node scripts/setup-lemonsqueezy-webhook.js
```

### 4. Update Vercel Environment Variables
- Replace test API key with production key
- Update webhook secret with new production secret
- Keep store ID the same (288054)

### 5. Redeploy
```bash
git push origin master
```

## Helper Scripts

All helper scripts are in the `scripts/` directory:

### `verify-lemonsqueezy-config.js`
Verifies that all LemonSqueezy configuration is correct.
```bash
node scripts/verify-lemonsqueezy-config.js
```

### `setup-lemonsqueezy-webhook.js`
Automatically creates a webhook in LemonSqueezy via API.
```bash
node scripts/setup-lemonsqueezy-webhook.js
```

### `delete-lemonsqueezy-webhook.js`
Deletes a webhook by ID (useful when recreating).
```bash
node scripts/delete-lemonsqueezy-webhook.js
```

### `setup-vercel-env.js`
Generates commands to set Vercel environment variables.
```bash
# Show commands
node scripts/setup-vercel-env.js

# Auto-configure (requires vercel CLI)
node scripts/setup-vercel-env.js --auto
```

## Troubleshooting

### Webhook not receiving events
1. Check webhook is active in LemonSqueezy dashboard
2. Verify webhook URL is correct: https://payrollshield.cloud/api/webhooks/lemonsqueezy
3. Check webhook secret matches environment variable
4. View webhook delivery logs in LemonSqueezy for errors

### Checkout not redirecting
1. Verify variant IDs are correct in `lib/billing/plans.ts`
2. Check API key has proper permissions
3. Ensure store ID is correct (288054)
4. Check browser console for errors

### Subscription not appearing
1. Verify webhook fired successfully
2. Check Supabase logs for errors
3. Ensure database migration was applied
4. Verify RLS policies allow user to see their org's subscription

### Database migration fails
1. Ensure Supabase CLI is installed: `npm install -g supabase`
2. Link to project: `supabase link --project-ref your-project-ref`
3. Try manual SQL execution in Supabase Dashboard

## Architecture Overview

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ├──────────────┐
       │              │
       v              v
┌────────────┐  ┌──────────────┐
│  /pricing  │  │/subscription │
│   Page     │  │    Page      │
└──────┬─────┘  └──────┬───────┘
       │               │
       v               v
┌───────────────────────────────┐
│     Next.js API Routes        │
│  /api/checkout/create         │
│  /api/subscription/cancel     │
│  /api/subscription/resume     │
└──────┬────────────────────────┘
       │
       v
┌─────────────────┐      ┌──────────────┐
│  LemonSqueezy   │─────→│  Webhook     │
│     Checkout    │      │   Handler    │
└─────────────────┘      └──────┬───────┘
                                │
                                v
                         ┌──────────────┐
                         │   Supabase   │
                         │  (Database)  │
                         └──────────────┘
```

## Security Checklist

- [ ] Webhook signature verification enabled
- [ ] Environment variables secured in Vercel
- [ ] RLS policies active on subscription table
- [ ] API keys stored in environment variables only
- [ ] .env.local added to .gitignore
- [ ] Test mode disabled in production
- [ ] HTTPS enabled for all endpoints

## Monitoring

### Key Metrics to Track
- Subscription creation success rate
- Webhook delivery success rate
- Checkout abandonment rate
- Payment failure rate
- Subscription cancellation rate

### Recommended Tools
- Vercel Analytics (built-in)
- LemonSqueezy Dashboard (webhook logs)
- Supabase Dashboard (database queries)
- Sentry (error tracking) - optional

## Support

For issues or questions:
- LemonSqueezy API: https://docs.lemonsqueezy.com/api
- Vercel Support: https://vercel.com/support
- Supabase Docs: https://supabase.com/docs

---

**Last Updated:** 2026-05-09
**Integration Version:** v1.0
**Test Mode:** Active (Switch to production when ready)
