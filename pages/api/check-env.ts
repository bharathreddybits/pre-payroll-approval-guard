import type { NextApiRequest, NextApiResponse } from 'next';

// GET /api/check-env
// Deployment health check: confirms required env vars are configured.
// Restricted to development or requests with the correct setup key.
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const key = req.headers['x-check-key'];
  const expectedKey = process.env.SETUP_SECRET_KEY;

  if (process.env.NODE_ENV === 'production') {
    if (!expectedKey || key !== expectedKey) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  res.status(200).json({
    supabase_url:         process.env.NEXT_PUBLIC_SUPABASE_URL      ? 'Set ✅' : 'Not set ❌',
    supabase_anon_key:    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set ✅' : 'Not set ❌',
    supabase_service_key: process.env.SUPABASE_SERVICE_ROLE_KEY     ? 'Set ✅' : 'Not set ❌',
    openai_api_key:       process.env.OPENAI_API_KEY                ? 'Set ✅' : 'Not set ❌',
    lemonsqueezy_api_key: process.env.LEMONSQUEEZY_API_KEY          ? 'Set ✅' : 'Not set ❌',
    lemonsqueezy_webhook: process.env.LEMONSQUEEZY_WEBHOOK_SECRET   ? 'Set ✅' : 'Not set ❌',
    app_url:              process.env.NEXT_PUBLIC_APP_URL            ? 'Set ✅' : 'Not set ❌',
  });
}
