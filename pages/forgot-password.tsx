import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) {
      toast.error('Failed to send reset email', { description: error.message });
    } else {
      setSent(true);
    }
  };

  return (
    <>
      <Head>
        <title>Forgot Password - PayrollShield</title>
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
              <CardTitle>Reset your password</CardTitle>
              <CardDescription>
                Enter your email and we'll send you a link to reset your password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sent ? (
                <div className="text-center py-4">
                  <p className="text-green-700 font-medium mb-2">Check your inbox</p>
                  <p className="text-sm text-gray-600 mb-4">
                    We sent a password reset link to <strong>{email}</strong>. Check your spam folder if you don't see it.
                  </p>
                  <Link href="/login" className="text-primary hover:underline text-sm font-medium">
                    Back to login
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                      placeholder="you@company.com"
                      autoComplete="email"
                    />
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? 'Sending...' : 'Send reset link'}
                  </Button>
                  <div className="text-center">
                    <Link href="/login" className="text-sm text-gray-600 hover:underline">
                      Back to login
                    </Link>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
