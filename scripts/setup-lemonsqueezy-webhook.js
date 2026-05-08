/**
 * LemonSqueezy Webhook Setup Script
 *
 * This script automatically creates a webhook in LemonSqueezy for subscription events.
 * Run this once to set up the webhook for your store.
 *
 * Usage: node scripts/setup-lemonsqueezy-webhook.js
 */

const https = require('https');
const crypto = require('crypto');

// Configuration
const LEMONSQUEEZY_API_KEY = process.env.LEMONSQUEEZY_API_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI5NGQ1OWNlZi1kYmI4LTRlYTUtYjE3OC1kMjU0MGZjZDY5MTkiLCJqdGkiOiJkZjJiNzkyZmMxYTk0ZGExMmJiNzk0MTQ2ZWVkYTQ2MDc3NzQ1MmRhMWJlMWRiZjQyYTU3ODFmNmJhZDQyOGFmMzIzNWI1Y2U1MWExMDViZCIsImlhdCI6MTc3ODI2NDY1Mi4zMzczMjcsIm5iZiI6MTc3ODI2NDY1Mi4zMzczMywiZXhwIjoxNzk0MDk2MDAwLjAzNjEzMywic3ViIjoiNjQ2Njc1NCIsInNjb3BlcyI6W119.hT-Eyw2fAOOpEaJkbAkUrqWpWo4lPVuoTx1ZosZNw5Nq4TwS5kYJiyHOW-lLnbiMFPx_Tgbau6J1wTaEovM0lVCxK6FK3olDp50MlqV4tXlQoN_uKVoc_bEuCqiJbJKYSzCEkM3lkEeRK_B3DoXpgTm9GRyuVzbK9gtLvvQcg01i3Md4AoTNzXVQxZWNyq6dBPVLtsuvwcbS2VqqHXnHHSXGe_vLEhkkG95kgFJBm5E_SQhxalKOXEsr1WSr06JJiWZ8VSYnPVuHAR1cq4ZnKTAyRzhaGBskXsCc-h23Rd8B-F6QNGuo_m30bz1-naKK_Pf4XCYx9To1WmzDSyZU82vwslWWuAUoDU_V5mbvIl1uFF9yedGc-UUEPc-mfoqAt8DrAUGT_0Qs9uwgZC0jNB9234AS3HY2rHpG4vU-QSuGMwh57ez67vs2wswxDkUglJEnvZ3EDLRAlJoTfrAc_BNemeIuaD745sHxlc2SdqqTozfwAxByxmwA5w1QroTcCzVlxq0IR3aF8AQM9Aga9NJB56ZsjmMXs3yu_lfzLHSSg13T9oESAGXBMjfy2Oi92mK9xy9-FUzldlMQQATUimIQejUxtrdfnWUnvym1EsxfB2Zs5cOfk8gD2KAeo71C7hGXqf1MNO_WrctmwhLwQ2RQOqoHSEcbBrODt1aAxec';
const STORE_ID = '288054';
const WEBHOOK_URL = 'https://payrollshield.cloud/api/webhooks/lemonsqueezy';

// Events to subscribe to
const WEBHOOK_EVENTS = [
  'subscription_created',
  'subscription_updated',
  'subscription_cancelled',
  'subscription_resumed',
  'subscription_payment_success',
  'subscription_payment_failed'
];

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`API Error ${res.statusCode}: ${JSON.stringify(parsed)}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (postData) {
      req.write(postData);
    }

    req.end();
  });
}

async function listWebhooks() {
  console.log('📋 Checking for existing webhooks...\n');

  const options = {
    hostname: 'api.lemonsqueezy.com',
    path: `/v1/webhooks?filter[store_id]=${STORE_ID}`,
    method: 'GET',
    headers: {
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      'Authorization': `Bearer ${LEMONSQUEEZY_API_KEY}`
    }
  };

  try {
    const response = await makeRequest(options);
    return response.data || [];
  } catch (error) {
    console.error('❌ Failed to list webhooks:', error.message);
    return [];
  }
}

async function createWebhook() {
  console.log('🚀 Creating LemonSqueezy webhook...\n');

  // Generate a secure random secret (max 40 characters)
  const webhookSecret = crypto.randomBytes(20).toString('hex'); // 20 bytes = 40 hex characters

  const webhookData = {
    data: {
      type: 'webhooks',
      attributes: {
        url: WEBHOOK_URL,
        events: WEBHOOK_EVENTS,
        secret: webhookSecret
      },
      relationships: {
        store: {
          data: {
            type: 'stores',
            id: STORE_ID
          }
        }
      }
    }
  };

  const postData = JSON.stringify(webhookData);

  const options = {
    hostname: 'api.lemonsqueezy.com',
    path: '/v1/webhooks',
    method: 'POST',
    headers: {
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      'Authorization': `Bearer ${LEMONSQUEEZY_API_KEY}`,
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  try {
    const response = await makeRequest(options, postData);
    // The API doesn't return the secret in the response, so we attach it
    response.data.generatedSecret = webhookSecret;
    return response.data;
  } catch (error) {
    throw new Error(`Failed to create webhook: ${error.message}`);
  }
}

async function main() {
  console.log('════════════════════════════════════════════════');
  console.log('   LemonSqueezy Webhook Setup for PayrollShield');
  console.log('════════════════════════════════════════════════\n');

  console.log('Configuration:');
  console.log(`  Store ID: ${STORE_ID}`);
  console.log(`  Webhook URL: ${WEBHOOK_URL}`);
  console.log(`  Events: ${WEBHOOK_EVENTS.join(', ')}\n`);

  try {
    // Check for existing webhooks
    const existingWebhooks = await listWebhooks();
    const existingWebhook = existingWebhooks.find(wh => wh.attributes.url === WEBHOOK_URL);

    if (existingWebhook) {
      console.log('✅ Webhook already exists!\n');
      console.log('Webhook Details:');
      console.log(`  ID: ${existingWebhook.id}`);
      console.log(`  URL: ${existingWebhook.attributes.url}`);
      console.log(`  Events: ${existingWebhook.attributes.events.join(', ')}`);
      console.log(`  Secret: ${existingWebhook.attributes.secret}\n`);

      console.log('════════════════════════════════════════════════');
      console.log('⚠️  IMPORTANT: Update your .env.local file:');
      console.log('════════════════════════════════════════════════');
      console.log(`LEMONSQUEEZY_WEBHOOK_SECRET=${existingWebhook.attributes.secret}\n`);

      return;
    }

    // Create new webhook
    const webhook = await createWebhook();

    console.log('✅ Webhook created successfully!\n');
    console.log('Webhook Details:');
    console.log(`  ID: ${webhook.id}`);
    console.log(`  URL: ${webhook.attributes.url}`);
    console.log(`  Events: ${webhook.attributes.events.join(', ')}`);
    console.log(`  Secret: ${webhook.generatedSecret}\n`);

    console.log('════════════════════════════════════════════════');
    console.log('⚠️  IMPORTANT: Update your .env.local file:');
    console.log('════════════════════════════════════════════════');
    console.log(`LEMONSQUEEZY_WEBHOOK_SECRET=${webhook.generatedSecret}\n`);

    console.log('════════════════════════════════════════════════');
    console.log('📝 Next Steps:');
    console.log('════════════════════════════════════════════════');
    console.log('1. Copy the webhook secret above to .env.local');
    console.log('2. Add the same secret to Vercel environment variables');
    console.log('3. Restart your development server');
    console.log('4. Test the integration with a test subscription\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nPlease check:');
    console.error('  - Your API key is correct and has the right permissions');
    console.error('  - Your store ID is correct');
    console.error('  - You have a stable internet connection\n');
    process.exit(1);
  }
}

main();
