import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Mail } from 'lucide-react';

export default function VerifyEmailPage() {
  const router = useRouter();
  const email = router.query.email as string | undefined;

  return (
    <>
      <Head>
        <title>Check Your Email - PayrollShield</title>
        <meta name="description" content="A verification link has been sent to your email address." />
      </Head>

      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <Link href="/" className="inline-block mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="PayrollShield" className="mx-auto block h-12 w-auto" />
          </Link>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-8 py-10">
            <div className="flex justify-center mb-6">
              <div className="bg-blue-50 rounded-full p-4">
                <Mail className="h-10 w-10 text-brand-blue" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-3">Check your email</h1>

            <p className="text-gray-600 mb-2">
              We sent a verification link to
            </p>
            {email && (
              <p className="font-semibold text-gray-900 mb-4 break-all">{email}</p>
            )}
            <p className="text-gray-600 mb-8">
              Click the link in the email to verify your account and get started. The link expires in 24 hours.
            </p>

            <div className="space-y-3 text-sm text-gray-500">
              <p>
                Didn&apos;t receive an email?{' '}
                <Link href="/signup" className="text-brand-blue hover:underline font-medium">
                  Try signing up again
                </Link>
              </p>
              <p>
                Already verified?{' '}
                <Link href="/login" className="text-brand-blue hover:underline font-medium">
                  Sign in
                </Link>
              </p>
              <p className="text-xs text-gray-400">
                Check your spam folder if you don&apos;t see the email within a few minutes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
