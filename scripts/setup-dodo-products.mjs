/**
 * Setup Dodo Payments Products
 *
 * Creates the 4 subscription products (Starter Monthly/Annual, Pro Monthly/Annual)
 * in your Dodo Payments account and prints the product IDs to add to your .env.
 *
 * Usage:
 *   DODO_PAYMENTS_API_KEY=your_key node scripts/setup-dodo-products.mjs
 *
 * Run once per environment (test + live). Product IDs are different for each.
 */

import DodoPayments from 'dodopayments';

const apiKey = process.env.DODO_PAYMENTS_API_KEY;
if (!apiKey) {
  console.error('Error: DODO_PAYMENTS_API_KEY environment variable is required');
  console.error('Usage: DODO_PAYMENTS_API_KEY=your_key node scripts/setup-dodo-products.mjs');
  process.exit(1);
}

const isLive = process.env.DODO_PAYMENTS_ENVIRONMENT === 'live_mode';
const client = new DodoPayments({
  bearerToken: apiKey,
  environment: isLive ? 'live_mode' : 'test_mode',
});

const products = [
  {
    envKey: 'DODO_PRODUCT_STARTER_MONTHLY',
    name: 'PayrollShield Starter Monthly',
    price: 24900,   // $249.00
    interval: 'Month',
    period: 'Month',
  },
  {
    envKey: 'DODO_PRODUCT_STARTER_ANNUAL',
    name: 'PayrollShield Starter Annual',
    price: 238800,  // $2,388.00 ($199/mo × 12)
    interval: 'Year',
    period: 'Year',
  },
  {
    envKey: 'DODO_PRODUCT_PRO_MONTHLY',
    name: 'PayrollShield Pro Monthly',
    price: 74900,   // $749.00
    interval: 'Month',
    period: 'Month',
  },
  {
    envKey: 'DODO_PRODUCT_PRO_ANNUAL',
    name: 'PayrollShield Pro Annual',
    price: 718800,  // $7,188.00 ($599/mo × 12)
    interval: 'Year',
    period: 'Year',
  },
];

console.log(`\nCreating products in ${isLive ? 'LIVE' : 'TEST'} mode...\n`);

const results = [];

for (const p of products) {
  try {
    const product = await client.products.create({
      name: p.name,
      tax_category: 'saas',
      description: `${p.name} — Pre-Payroll Approval Guard`,
      price: {
        type: 'recurring_price',
        price: p.price,
        currency: 'USD',
        discount: 0,
        purchasing_power_parity: false,
        payment_frequency_count: 1,
        payment_frequency_interval: p.interval,
        subscription_period_count: 1,
        subscription_period_interval: p.period,
        trial_period_days: 7,
        tax_inclusive: false,
      },
    });

    const id = product.product_id;
    console.log(`✓ ${p.name}`);
    console.log(`  Product ID: ${id}`);
    results.push({ envKey: p.envKey, id });
  } catch (err) {
    console.error(`✗ Failed to create ${p.name}:`, err.message);
  }
}

if (results.length > 0) {
  console.log('\n─────────────────────────────────────────────');
  console.log('Add these to your Vercel environment variables');
  console.log('(and to .env for local dev):');
  console.log('─────────────────────────────────────────────');
  for (const { envKey, id } of results) {
    console.log(`${envKey}=${id}`);
  }
  console.log('─────────────────────────────────────────────\n');
}
