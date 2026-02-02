import { NextApiRequest, NextApiResponse } from 'next';
import { getTemplateHeaders } from '../../lib/canonicalSchema';

/**
 * GET /api/template
 * Returns a downloadable CSV file with all canonical schema headers.
 * Users can fill this in and upload — guarantees correct column names.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const headers = getTemplateHeaders();
  const csvContent = headers.join(',') + '\n';

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="payrollshield_template.csv"');
  res.status(200).send(csvContent);
}
