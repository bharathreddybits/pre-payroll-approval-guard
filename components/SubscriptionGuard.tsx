import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useSubscriptionStatus } from '../hooks/useSubscriptionStatus';
import { useAuth } from '../contexts/AuthContext';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  /** Whether to show loading state or render children while loading */
  loadingBehavior?: 'block' | 'pass';
}

/**
 * SubscriptionGuard Component
 *
 * Wraps protected pages and blocks access if:
 * - User is not authenticated
 * - Trial has expired and no active subscription
 *
 * Shows appropriate messaging and CTAs to get user to subscribe.
 */
export function SubscriptionGuard({ children, loadingBehavior = 'block' }: SubscriptionGuardProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const subscriptionStatus = useSubscriptionStatus();

  // Show loading state while checking auth and subscription
  if (authLoading || subscriptionStatus.loading) {
    if (loadingBehavior === 'block') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }
    // Pass through - render children while loading
    return <>{children}</>;
  }

  // Redirect to login if not authenticated
  if (!user) {
    router.push('/login');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Block access if trial expired or no subscription
  if (!subscriptionStatus.hasAccess) {
    // Determine which blocked state we're in
    const isTrialExpired = subscriptionStatus.trialEnded === true;
    const isCancelled =
      subscriptionStatus.status === 'expired' && !subscriptionStatus.trialEnded;
    const hasNoSubscription = subscriptionStatus.status === 'none';

    const heading = isTrialExpired
      ? 'Trial Ended'
      : isCancelled
      ? 'Subscription Cancelled'
      : 'Subscription Required';

    const body = isTrialExpired
      ? 'Your 7-day free trial has ended. Upgrade to continue using PayrollShield.'
      : isCancelled
      ? 'Your subscription was cancelled. Reactivate to continue using PayrollShield.'
      : hasNoSubscription
      ? 'You need an active subscription to access this feature.'
      : 'You need an active subscription to access this feature.';

    const ctaLabel = isTrialExpired
      ? 'Upgrade Now'
      : isCancelled
      ? 'Reactivate Subscription'
      : 'View Plans & Subscribe';

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              {heading}
            </h2>

            <p className="text-gray-600 mb-6">
              {body}
            </p>

            <div className="space-y-3">
              <Link
                href="/pricing"
                className="block w-full bg-brand-blue text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-blue-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 text-center"
              >
                {ctaLabel}
                <ArrowRight className="inline-block ml-2 h-4 w-4" />
              </Link>

              <Link
                href="/dashboard"
                className="block w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 text-center"
              >
                Go to Dashboard
              </Link>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-4">
                <strong>7-day money-back guarantee</strong>
              </p>
              <p className="text-xs text-gray-400">
                Start a subscription with full access. If you&apos;re not satisfied for any reason,
                request a full refund within 7 days.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Has access - render children
  return <>{children}</>;
}
