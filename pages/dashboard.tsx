import React, { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';
import { Header } from '../components/Header';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { DashboardStats } from '../components/DashboardStats';
import { ReviewSessionsTable } from '../components/ReviewSessionsTable';
import { Skeleton } from '../components/ui/skeleton';
import { Button } from '../components/ui/button';
import { WelcomeModal, OnboardingChecklist } from '../components/onboarding';
import { TrialBanner } from '../components/TrialBanner';
import { supabase } from '../lib/supabase';

interface DashboardData {
  stats: {
    total_reviews: number;
    approved: number;
    rejected: number;
    pending: number;
    failed?: number;
  };
  recent_activity: Array<{
    approval_id: string;
    review_session_id: string;
    organization_name: string;
    period: string;
    approval_status: string;
    approval_notes: string | null;
    approved_at: string;
    approved_by: string | null;
  }>;
  sessions: Array<{
    review_session_id: string;
    organization_name: string;
    status: string;
    period: string;
    pay_date: string;
    run_type: string;
    total_changes: number;
    material_changes: number;
    blockers: number;
    approval_status: string;
    created_at: string;
  }>;
  is_new_user: boolean;
  onboarding: {
    account_created: boolean;
    first_upload: boolean;
    first_review: boolean;
  };
  latest_session_id: string | null;
  pagination: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Stats skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="bg-white rounded-lg border p-4">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async (offset = 0, append = false) => {
    if (offset === 0) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const headers: Record<string, string> = authSession?.access_token
        ? { Authorization: `Bearer ${authSession.access_token}` }
        : {};

      const response = await fetch(`/api/dashboard?offset=${offset}`, { headers });

      if (response.status === 401) {
        router.push('/login');
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const dashboardData: DashboardData = await response.json();
      if (append && data) {
        setData({ ...dashboardData, sessions: [...data.sessions, ...dashboardData.sessions] });
      } else {
        setData(dashboardData);
      }
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError(err.message || 'Failed to load dashboard');
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [data]);

  useEffect(() => {
    fetchDashboardData(0);
  }, []);

  // Show success toast when redirected back from checkout
  useEffect(() => {
    if (router.query.checkout === 'success') {
      toast.success('Subscription activated!', {
        description: 'Welcome to PayrollShield. Your plan is now active.',
        duration: 6000,
      });
      router.replace('/dashboard', undefined, { shallow: true });
    }
  }, [router.query.checkout]);

  return (
    <ProtectedRoute>
      <Head>
        <title>Dashboard - PayrollShield</title>
        <meta name="description" content="View payroll review history and audit trail" />
      </Head>

      <Header />

      <TrialBanner />

      <main className="min-h-screen bg-slate-50">
        {/* Page Header */}
        <div className="border-b border-slate-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  Review history and audit trail
                </p>
              </div>
              <Link href="/upload">
                <Button className="bg-brand-blue hover:bg-brand-blue-dark text-white shadow-sm">
                  <Upload className="h-4 w-4 mr-1.5" />
                  Upload Payroll
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 flex items-center justify-between gap-4">
              <p className="text-red-800">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchDashboardData(0)}
                className="shrink-0 text-red-700 border-red-300 hover:bg-red-100"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Loading State */}
          {loading && <DashboardSkeleton />}

          {/* Dashboard Content */}
          {!loading && data && (
            <>
              {/* Welcome Modal for new users */}
              <WelcomeModal isNewUser={data.is_new_user} />

              {/* Show onboarding checklist if not all steps complete */}
              {(!data.onboarding.first_upload || !data.onboarding.first_review) && (
                <div className="mb-8">
                  <OnboardingChecklist
                    progress={data.onboarding}
                    latestSessionId={data.latest_session_id || undefined}
                  />
                </div>
              )}

              {/* Stats Cards */}
              <DashboardStats stats={data.stats} />
              <div className="flex items-center gap-4 mt-2">
                <p className="text-sm text-gray-500">Showing all-time activity</p>
                {data.stats.total_reviews > 0 && (
                  <p className="text-sm text-gray-500">
                    Approved: {data.stats.approved} of {data.stats.total_reviews} completed
                  </p>
                )}
              </div>

              {/* Review Sessions — full width */}
              {data.sessions.length > 0 && (
                <p className="text-sm text-gray-500 mt-6 mb-2">
                  Showing {data.sessions.length} of {data.pagination.total} review{data.pagination.total !== 1 ? 's' : ''}
                </p>
              )}
              <ReviewSessionsTable
                sessions={data.sessions}
                recentActivity={data.recent_activity}
              />
              {data.pagination.has_more && (
                <div className="flex justify-center mt-4">
                  <Button
                    variant="outline"
                    onClick={() => fetchDashboardData(data.sessions.length, true)}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Loading...' : `Load more (${data.pagination.total - data.sessions.length} remaining)`}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
