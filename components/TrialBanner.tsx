import React from 'react';
import Link from 'next/link';
import { AlertTriangle, Clock, X } from 'lucide-react';
import { useSubscriptionStatus } from '../hooks/useSubscriptionStatus';

export function TrialBanner() {
  const subscriptionStatus = useSubscriptionStatus();
  const [dismissed, setDismissed] = React.useState(false);

  // Don't show if dismissed
  if (dismissed) return null;

  // Don't show while loading
  if (subscriptionStatus.loading) return null;

  // Don't show if active subscription
  if (subscriptionStatus.status === 'active') return null;

  // Trial expired - critical banner
  if (subscriptionStatus.trialEnded) {
    return (
      <div className="bg-red-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between flex-wrap">
            <div className="flex items-center flex-1">
              <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0" />
              <p className="font-medium text-sm">
                Your free trial has ended. Subscribe now to continue using PayrollShield.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/pricing"
                className="bg-white text-red-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors"
              >
                View Plans
              </Link>
              <button
                onClick={() => setDismissed(true)}
                className="text-white/80 hover:text-white"
                aria-label="Dismiss"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Trial expiring soon (3 days or less) - warning banner
  if (
    subscriptionStatus.status === 'trialing' &&
    subscriptionStatus.daysRemaining !== undefined &&
    subscriptionStatus.daysRemaining <= 3
  ) {
    const daysText = subscriptionStatus.daysRemaining === 1
      ? '1 day'
      : `${subscriptionStatus.daysRemaining} days`;

    return (
      <div className="bg-amber-500 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between flex-wrap">
            <div className="flex items-center flex-1">
              <Clock className="h-5 w-5 mr-3 flex-shrink-0" />
              <p className="font-medium text-sm">
                Your free trial ends in <strong>{daysText}</strong>. Subscribe now to keep your access.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/pricing"
                className="bg-white text-amber-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-50 transition-colors"
              >
                Subscribe Now
              </Link>
              <button
                onClick={() => setDismissed(true)}
                className="text-white/80 hover:text-white"
                aria-label="Dismiss"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No subscription but has access - soft reminder
  if (subscriptionStatus.needsSubscription && subscriptionStatus.hasAccess) {
    return (
      <div className="bg-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between flex-wrap">
            <div className="flex items-center flex-1">
              <Clock className="h-5 w-5 mr-3 flex-shrink-0" />
              <p className="font-medium text-sm">
                Start your 7-day free trial to unlock all features.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/pricing"
                className="bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors"
              >
                Start Free Trial
              </Link>
              <button
                onClick={() => setDismissed(true)}
                className="text-white/80 hover:text-white"
                aria-label="Dismiss"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
