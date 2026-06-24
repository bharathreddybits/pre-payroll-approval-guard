import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Supabase sets the session from the recovery link automatically.
    // We just need to confirm the user is authenticated before showing the form.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      } else {
        setError('This reset link is invalid or has expired. Please request a new one.');
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      toast.error('Failed to update password', { description: updateError.message });
    } else {
      toast.success('Password updated successfully');
      router.push('/dashboard');
    }
  };

  return (
    <>
      <Head>
        <title>Reset Password - PayrollShield</title>
      </Head>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <Link href="/" className="inline-block mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="PayrollShield" className="mx-auto block h-12 w-auto" />
          </Link>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Set new password</CardTitle>
              <CardDescription>Enter and confirm your new password.</CardDescription>
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="text-center py-4">
                  <p className="text-red-700 font-medium mb-4">{error}</p>
                  <Link href="/forgot-password" className="text-primary hover:underline text-sm font-medium">
                    Request a new link
                  </Link>
                </div>
              ) : !sessionReady ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      New password
                    </label>
                    <input
                      id="password"
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                    />
                  </div>
                  <div>
                    <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm new password
                    </label>
                    <input
                      id="confirm"
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-brand-blue ${
                        confirmPassword && confirmPassword !== password ? 'border-red-400' : 'border-gray-300'
                      }`}
                      placeholder="Repeat your new password"
                      autoComplete="new-password"
                    />
                    {confirmPassword && confirmPassword !== password && (
                      <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={loading || password !== confirmPassword || password.length < 8}
                  >
                    {loading ? 'Updating...' : 'Set new password'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
