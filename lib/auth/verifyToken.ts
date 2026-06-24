import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { User } from '@supabase/supabase-js';

// Shared anon client for token verification — singleton to reuse connection pool.
let _anonClient: ReturnType<typeof createClient> | null = null;

function getAnonClient() {
  if (_anonClient) return _anonClient;
  _anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return _anonClient;
}

export interface VerifiedAuth {
  user: User;
}

/**
 * Verify the Bearer token from the Authorization header.
 * Returns the authenticated user or sends a 401 response and returns null.
 * Usage: `const auth = await verifyToken(req, res); if (!auth) return;`
 */
export async function verifyToken(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<VerifiedAuth | null> {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    res.status(401).json({ error: 'Authorization required' });
    return null;
  }

  const { data: { user }, error } = await getAnonClient().auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: 'Invalid token' });
    return null;
  }

  return { user };
}
