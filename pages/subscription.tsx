import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Header } from '../components/Header';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { CreditCard, Calendar, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface Subscription {
  id: string;
  plan_id: string;
  tier: 'starter' | 'pro';
  status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  lemonsqueezy_subscription_id: string;
}

interface Organization {
  organization_id: string;
  organization_name: string;
}

function SubscriptionContent() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [resuming, setResuming] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetchSubscriptionData();
  }, [user]);

  async function fetchSubscriptionData() {
    if (!user) return;

    try {
      // Fetch user's organization
      const { data: orgData, error: orgError } = await supabase
        .from('user_organization_mapping')
        .select(`
          organization:organization_id (
            organization_id,
            organization_name
          )
        `)
        .eq('user_id', user.id)
        .single();

      if (orgError) throw orgError;

      const org = {
        organization_id: (orgData as any).organization.organization_id,
        organization_name: (orgData as any).organization.organization_name,
      };
      setOrganization(org);

      // Fetch subscription for this organization
      const { data: subData, error: subError } = await supabase
        .from('subscription')
        .select('*')
        .eq('organization_id', org.organization_id)
        .single();

      if (subError && subError.code !== 'PGRST116') { // PGRST116 = no rows found
        throw subError;
      }

      setSubscription(subData);
    } catch (error) {
      console.error('Failed to fetch subscription data:', error);
      toast.error('Failed to load subscription details');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelSubscription() {
    if (!subscription || !confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.')) {
      return;
    }

    setCancelling(true);

    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: subscription.lemonsqueezy_subscription_id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel subscription');
      }

      toast.success('Subscription cancelled', {
        description: 'You will retain access until the end of your billing period.',
      });

      // Refresh subscription data
      await fetchSubscriptionData();
    } catch (error: any) {
      console.error('Cancellation error:', error);
      toast.error('Failed to cancel subscription', {
        description: error.message,
      });
    } finally {
      setCancelling(false);
    }
  }

  async function handleResumeSubscription() {
    if (!subscription || !confirm('Resume your subscription? Your billing will continue as scheduled.')) {
      return;
    }

    setResuming(true);

    try {
      const response = await fetch('/api/subscription/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: subscription.lemonsqueezy_subscription_id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to resume subscription');
      }

      toast.success('Subscription resumed', {
        description: 'Your subscription is now active again.',
      });

      // Refresh subscription data
      await fetchSubscriptionData();
    } catch (error: any) {
      console.error('Resume error:', error);
      toast.error('Failed to resume subscription', {
        description: error.message,
      });
    } finally {
      setResuming(false);
    }
  }

  function getStatusBadge(status: Subscription['status']) {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Active</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><CheckCircle2 className="h-3 w-3 mr-1" />Trial</Badge>;
      case 'past_due':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200"><AlertCircle className="h-3 w-3 mr-1" />Past Due</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      case 'expired':
        return <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle className="h-3 w-3 mr-1" />Expired</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  }

  function formatPlanName(planId: string): string {
    const plans: Record<string, string> = {
      starter_monthly: 'Starter (Monthly)',
      starter_annual: 'Starter (Annual)',
      pro_monthly: 'Pro (Monthly)',
      pro_annual: 'Pro (Annual)',
    };
    return plans[planId] || planId;
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-4xl mx-auto px-6 py-12">
          <div className="text-center">
            <p className="text-gray-500">Loading subscription details...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Subscription — PayrollShield</title>
      </Head>

      <Header />

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Subscription</h1>
          {organization && (
            <p className="text-gray-600">Managing subscription for {organization.organization_name}</p>
          )}
        </div>

        {!subscription ? (
          <Card>
            <CardHeader>
              <CardTitle>No Active Subscription</CardTitle>
              <CardDescription>You don't have an active subscription yet.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-6">
                Choose a plan to get started with PayrollShield and access powerful payroll review features.
              </p>
              <Link href="/pricing">
                <Button>View Plans</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Current Plan Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Current Plan
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {formatPlanName(subscription.plan_id)}
                    </CardDescription>
                  </div>
                  {getStatusBadge(subscription.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Billing Period</p>
                      <p className="text-sm text-gray-600">
                        {formatDate(subscription.current_period_start)} — {formatDate(subscription.current_period_end)}
                      </p>
                    </div>
                  </div>

                  {subscription.cancel_at_period_end && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-900">Subscription Ending</p>
                          <p className="text-sm text-amber-700">
                            Your subscription will end on {formatDate(subscription.current_period_end)}.
                            You will retain access until then.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions Card */}
            <Card>
              <CardHeader>
                <CardTitle>Manage Subscription</CardTitle>
                <CardDescription>Update your plan or cancel your subscription</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Link href="/pricing">
                      <Button variant="outline" className="w-full sm:w-auto">
                        Change Plan
                      </Button>
                    </Link>
                    <p className="text-xs text-gray-500 mt-2">
                      Upgrade to Pro for unlimited employees and AI-powered features
                    </p>
                  </div>

                  <div className="pt-4 border-t">
                    {!subscription.cancel_at_period_end ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={handleCancelSubscription}
                          disabled={cancelling}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
                        </Button>
                        <p className="text-xs text-gray-500 mt-2">
                          You will retain access until the end of your billing period
                        </p>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          onClick={handleResumeSubscription}
                          disabled={resuming}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          {resuming ? 'Resuming...' : 'Resume Subscription'}
                        </Button>
                        <p className="text-xs text-gray-500 mt-2">
                          Continue your subscription and retain access beyond the current period
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <ProtectedRoute>
      <SubscriptionContent />
    </ProtectedRoute>
  );
}
