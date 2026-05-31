/**
 * Local Dodo Payments Webhook Simulator
 *
 * Fires a signed test payload at your local dev server so you can verify
 * the webhook handler without needing ngrok or a live Dodo event.
 *
 * Usage (dev server must be running on port 3000):
 *   node scripts/dev/test-webhook.mjs [event-type]
 *
 * Examples:
 *   node scripts/dev/test-webhook.mjs subscription.active
 *   node scripts/dev/test-webhook.mjs subscription.cancelled
 *   node scripts/dev/test-webhook.mjs subscription.renewed
 */

import crypto from 'crypto';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// Load .env manually (no dotenv dependency needed)
const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env');
const envLines = readFileSync(envPath, 'utf8').split('\n');
const env = {};
for (const line of envLines) {
  const [key, ...rest] = line.split('=');
  if (key && !key.startsWith('#') && rest.length) {
    env[key.trim()] = rest.join('=').trim();
  }
}

const WEBHOOK_KEY = env.DODO_PAYMENTS_WEBHOOK_KEY;
const TARGET_URL = 'http://localhost:3000/api/webhooks/dodopayments';

// Use a real org ID from your DB, or leave as a test UUID
const TEST_ORG_ID = process.env.TEST_ORG_ID || 'test-org-00000000-0000-0000-0000-000000000001';
const TEST_SUB_ID = 'sub_test_' + Date.now();

const eventType = process.argv[2] || 'subscription.active';

const payloads = {
  'subscription.active': {
    subscription_id: TEST_SUB_ID,
    product_id: env.DODO_PRODUCT_STARTER_MONTHLY,
    status: 'active',
    cancel_at_next_billing_date: false,
    next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: {
      organization_id: TEST_ORG_ID,
      plan_id: 'starter_monthly',
    },
  },
  'subscription.renewed': {
    subscription_id: TEST_SUB_ID,
    status: 'active',
    cancel_at_next_billing_date: false,
    next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: { organization_id: TEST_ORG_ID },
  },
  'subscription.updated': {
    subscription_id: TEST_SUB_ID,
    product_id: env.DODO_PRODUCT_STARTER_MONTHLY,
    status: 'active',
    cancel_at_next_billing_date: true,
    next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: { organization_id: TEST_ORG_ID },
  },
  'subscription.on_hold': {
    subscription_id: TEST_SUB_ID,
    status: 'on_hold',
    metadata: { organization_id: TEST_ORG_ID },
  },
  'subscription.cancelled': {
    subscription_id: TEST_SUB_ID,
    status: 'cancelled',
    metadata: { organization_id: TEST_ORG_ID },
  },
  'subscription.expired': {
    subscription_id: TEST_SUB_ID,
    status: 'expired',
    metadata: { organization_id: TEST_ORG_ID },
  },
};

const data = payloads[eventType];
if (!data) {
  console.error(`Unknown event type: ${eventType}`);
  console.error('Supported:', Object.keys(payloads).join(', '));
  process.exit(1);
}

const body = JSON.stringify({ type: eventType, data });
const webhookId = 'wh_test_' + Date.now();
const timestamp = Math.floor(Date.now() / 1000).toString();

function sign(body, webhookId, timestamp, secret) {
  const secretBase64 = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  const secretBytes = Buffer.from(secretBase64, 'base64');
  const toSign = `${webhookId}.${timestamp}.${body}`;
  const digest = crypto.createHmac('sha256', secretBytes).update(toSign).digest('base64');
  return `v1,${digest}`;
}

const signature = WEBHOOK_KEY ? sign(body, webhookId, timestamp, WEBHOOK_KEY) : 'v1,unsigned';

console.log(`\nFiring ${eventType} → ${TARGET_URL}`);
console.log(`  org_id: ${TEST_ORG_ID}`);
console.log(`  signed: ${WEBHOOK_KEY ? 'yes' : 'NO (DODO_PAYMENTS_WEBHOOK_KEY not set)'}\n`);

const response = await fetch(TARGET_URL, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'webhook-id': webhookId,
    'webhook-timestamp': timestamp,
    'webhook-signature': signature,
  },
  body,
});

const text = await response.text();
console.log(`Response: ${response.status} ${response.statusText}`);
try {
  console.log(JSON.stringify(JSON.parse(text), null, 2));
} catch {
  console.log(text);
}

if (response.status === 200) {
  console.log('\n✓ Webhook handler accepted the event. Check your Supabase subscription table.');
} else {
  console.log('\n✗ Webhook handler rejected the event. Check the dev server logs.');
}
