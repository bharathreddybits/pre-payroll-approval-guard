import { NextApiRequest, NextApiResponse } from 'next';
import { processReview } from '../../lib/processReview';

/**
 * POST /api/compare
 * Calculate differences and apply judgements for a review session
 *
 * DEPRECATED: This endpoint is maintained for backwards compatibility only.
 * The upload API now processes reviews automatically.
 *
 * Request body:
 *   { review_session_id: string }
 *
 * Response:
 *   {
 *     success: boolean,
 *     review_session_id: string,
 *     delta_count: number,
 *     material_count: number,
 *     blocker_count: number,
 *     timestamp: string
 *   }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { review_session_id } = req.body;

    if (!review_session_id) {
      return res.status(400).json({ error: 'review_session_id is required' });
    }

    console.log(`[DEPRECATED] Processing review session: ${review_session_id}`);
    console.log('Note: This endpoint is deprecated. Upload API processes automatically.');

    // Use TypeScript processing function instead of Python scripts
    const result = await processReview(review_session_id);

    // Return success response
    return res.status(200).json({
      success: result.success,
      review_session_id,
      delta_count: result.delta_count,
      material_count: result.material_count,
      blocker_count: result.blocker_count,
      timestamp: new Date().toISOString(),
      deprecated: true,
      message: 'This endpoint is deprecated. Upload API processes reviews automatically.'
    });
  } catch (error: any) {
    console.error('Comparison error:', error);
    return res.status(500).json({
      error: 'Failed to process comparison',
      details: error.message,
    });
  }
}
