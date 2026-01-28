import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const diffUrl = process.env.N8N_DIFF_WEBHOOK_URL;
  const judgementUrl = process.env.N8N_JUDGEMENT_WEBHOOK_URL;

  res.status(200).json({
    n8n_diff_webhook: diffUrl ? 'Set ✅' : 'Not set ❌',
    n8n_judgement_webhook: judgementUrl ? 'Set ✅' : 'Not set ❌',
    diff_url_value: diffUrl || 'undefined',
    judgement_url_value: judgementUrl || 'undefined'
  });
}
