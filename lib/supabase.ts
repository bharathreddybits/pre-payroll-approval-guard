import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase client for browser-side operations (uses anon key)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client with service role (bypass RLS)
// Singleton: reuse the same client across requests to share the HTTP connection pool.
let _serviceClient: SupabaseClient | null = null;

export function getServiceSupabase(): SupabaseClient {
  if (_serviceClient) return _serviceClient;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  _serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return _serviceClient;
}
