import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const [message, setMessage] = useState('Confirming your email...');
  const hasRun = useRef(false);

  useEffect(() => {
    // React Strict Mode double-invokes effects in dev; the PKCE code is single-use,
    // so the second call would fail with "code already used". Guard against that.
    if (hasRun.current) return;
    hasRun.current = true;

    const handleCallback = async () => {
      try {
        // Get the auth code from URL hash or query params
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);

        const code = queryParams.get('code');
        const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
        const type = hashParams.get('type') || queryParams.get('type');
        const error = hashParams.get('error') || queryParams.get('error');
        const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');

        if (error) {
          setMessage(`Error: ${errorDescription || error}`);
          setTimeout(() => router.push('/login'), 3000);
          return;
        }

        // PKCE flow (Supabase default for SPA): exchange authorization code for session
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            setMessage('Verification failed. Redirecting to login...');
            setTimeout(() => router.push('/login'), 2000);
            return;
          }
        } else if (accessToken && refreshToken) {
          // Legacy implicit flow: set session from tokens in URL hash
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            setMessage('Session error. Redirecting to login...');
            setTimeout(() => router.push('/login'), 2000);
            return;
          }
        }

        // Check if user is now authenticated
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          // Organization is created by the DB trigger (migration 008) on signup.
          // init-account is called in AuthContext.ensureUserHasOrganization on every login.
          // Nothing to do here — just redirect to dashboard.
          setMessage('Email confirmed! Redirecting...');
          setTimeout(() => router.push('/dashboard'), 1500);
        } else if (type === 'signup' || type === 'email_confirmation') {
          setMessage('Email confirmed! Please sign in.');
          setTimeout(() => router.push('/login'), 2000);
        } else {
          setMessage('Redirecting...');
          setTimeout(() => router.push('/login'), 1500);
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setMessage('Something went wrong. Redirecting to login...');
        setTimeout(() => router.push('/login'), 2000);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <>
      <Head>
        <title>Confirming... - PayrollShield</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">{message}</p>
        </div>
      </div>
    </>
  );
}
