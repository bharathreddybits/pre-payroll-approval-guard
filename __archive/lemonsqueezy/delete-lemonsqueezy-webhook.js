/**
 * Delete LemonSqueezy Webhook Script
 *
 * Deletes the webhook we just created so we can recreate it with proper secret tracking
 */

const https = require('https');

const LEMONSQUEEZY_API_KEY = process.env.LEMONSQUEEZY_API_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI5NGQ1OWNlZi1kYmI4LTRlYTUtYjE3OC1kMjU0MGZjZDY5MTkiLCJqdGkiOiJkZjJiNzkyZmMxYTk0ZGExMmJiNzk0MTQ2ZWVkYTQ2MDc3NzQ1MmRhMWJlMWRiZjQyYTU3ODFmNmJhZDQyOGFmMzIzNWI1Y2U1MWExMDViZCIsImlhdCI6MTc3ODI2NDY1Mi4zMzczMjcsIm5iZiI6MTc3ODI2NDY1Mi4zMzczMywiZXhwIjoxNzk0MDk2MDAwLjAzNjEzMywic3ViIjoiNjQ2Njc1NCIsInNjb3BlcyI6W119.hT-Eyw2fAOOpEaJkbAkUrqWpWo4lPVuoTx1ZosZNw5Nq4TwS5kYJiyHOW-lLnbiMFPx_Tgbau6J1wTaEovM0lVCxK6FK3olDp50MlqV4tXlQoN_uKVoc_bEuCqiJbJKYSzCEkM3lkEeRK_B3DoXpgTm9GRyuVzbK9gtLvvQcg01i3Md4AoTNzXVQxZWNyq6dBPVLtsuvwcbS2VqqHXnHHSXGe_vLEhkkG95kgFJBm5E_SQhxalKOXEsr1WSr06JJiWZ8VSYnPVuHAR1cq4ZnKTAyRzhaGBskXsCc-h23Rd8B-F6QNGuo_m30bz1-naKK_Pf4XCYx9To1WmzDSyZU82vwslWWuAUoDU_V5mbvIl1uFF9yedGc-UUEPc-mfoqAt8DrAUGT_0Qs9uwgZC0jNB9234AS3HY2rHpG4vU-QSuGMwh57ez67vs2wswxDkUglJEnvZ3EDLRAlJoTfrAc_BNemeIuaD745sHxlc2SdqqTozfwAxByxmwA5w1QroTcCzVlxq0IR3aF8AQM9Aga9NJB56ZsjmMXs3yu_lfzLHSSg13T9oESAGXBMjfy2Oi92mK9xy9-FUzldlMQQATUimIQejUxtrdfnWUnvym1EsxfB2Zs5cOfk8gD2KAeo71C7hGXqf1MNO_WrctmwhLwQ2RQOqoHSEcbBrODt1aAxec';
const WEBHOOK_ID = '98183';

function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 204) {
          resolve({ success: true });
        } else {
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
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function main() {
  console.log(`Deleting webhook ${WEBHOOK_ID}...`);

  const options = {
    hostname: 'api.lemonsqueezy.com',
    path: `/v1/webhooks/${WEBHOOK_ID}`,
    method: 'DELETE',
    headers: {
      'Accept': 'application/vnd.api+json',
      'Authorization': `Bearer ${LEMONSQUEEZY_API_KEY}`
    }
  };

  try {
    await makeRequest(options);
    console.log('✅ Webhook deleted successfully!');
  } catch (error) {
    console.error('❌ Failed to delete webhook:', error.message);
    process.exit(1);
  }
}

main();
