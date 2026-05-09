import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface SubscriptionStatus {
  hasAccess: boolean;
  status: 'active' | 'trialing' | 'expired' | 'none' | 'loading';
  daysRemaining?: number;
  trialEnded?: boolean;
  needsSubscription?: boolean;
  loading: boolean;
  error?: string;
}

export function useSubscriptionStatus() {
  const { user } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    hasAccess: true, // Optimistic - assume access until proven otherwise
    status: 'loading',
    loading: true,
  });

  useEffect(() => {
    async function checkSubscription() {
      if (!user) {
        setSubscriptionStatus({
          hasAccess: false,
          status: 'none',
          loading: false,
          needsSubscription: true,
        });
        return;
      }

      try {
        // Get user's organization
        const { data: mapping, error: mappingError } = await supabase
          .from('user_organization_mapping')
          .select('organization_id')
          .eq('user_id', user.id)
          .single();

        if (mappingError || !mapping) {
          setSubscriptionStatus({
            hasAccess: false,
            status: 'none',
            loading: false,
            needsSubscription: true,
            error: 'No organization found',
          });
          return;
        }

        const organizationId = mapping.organization_id;

        // Get subscription for this organization
        const { data: subscription, error: subError } = await supabase
          .from('subscription')
          .select('*')
          .eq('organization_id', organizationId)
          .single();

        if (subError || !subscription) {
          // No subscription - allow access for now (grace period)
          // In production, you might want to block access immediately
          setSubscriptionStatus({
            hasAccess: true, // Allow access even without subscription (for now)
            status: 'none',
            loading: false,
            needsSubscription: true,
          });
          return;
        }

        const now = new Date();
        const status = subscription.status;

        // Active subscription
        if (status === 'active') {
          const periodEnd = new Date(subscription.current_period_end);
          const daysRemaining = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          setSubscriptionStatus({
            hasAccess: true,
            status: 'active',
            daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
            loading: false,
          });
          return;
        }

        // Trialing subscription
        if (status === 'trialing') {
          const trialEnd = subscription.trial_end_date ? new Date(subscription.trial_end_date) : null;

          if (!trialEnd) {
            setSubscriptionStatus({
              hasAccess: true,
              status: 'trialing',
              loading: false,
            });
            return;
          }

          const isExpired = trialEnd <= now;
          const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (isExpired) {
            setSubscriptionStatus({
              hasAccess: false,
              status: 'expired',
              trialEnded: true,
              needsSubscription: true,
              daysRemaining: 0,
              loading: false,
            });
            return;
          }

          setSubscriptionStatus({
            hasAccess: true,
            status: 'trialing',
            daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
            loading: false,
          });
          return;
        }

        // Expired or cancelled
        if (status === 'expired' || status === 'cancelled') {
          setSubscriptionStatus({
            hasAccess: false,
            status: 'expired',
            needsSubscription: true,
            loading: false,
          });
          return;
        }

        // Past due - allow access during grace period
        if (status === 'past_due') {
          setSubscriptionStatus({
            hasAccess: true,
            status: 'active',
            daysRemaining: 0,
            loading: false,
          });
          return;
        }

        // Default: no access
        setSubscriptionStatus({
          hasAccess: false,
          status: 'expired',
          needsSubscription: true,
          loading: false,
        });

      } catch (error) {
        console.error('Error checking subscription:', error);
        setSubscriptionStatus({
          hasAccess: true, // Allow access on error (fail open)
          status: 'loading',
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    checkSubscription();
  }, [user]);

  return subscriptionStatus;
}
