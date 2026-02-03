import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { toast } from 'sonner';
import { Header } from '../components/Header';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { DashboardStats } from '../components/DashboardStats';
import { ReviewSessionsTable } from '../components/ReviewSessionsTable';
import { Skeleton } from '../components/ui/skeleton';
import { Button } from '../components/ui/button';
import { WelcomeModal, OnboardingChecklist } from '../components/onboarding';

interface DashboardData {
  stats: {
    total_reviews: number;
    approved: number;
    rejected: number;
    pending: number;
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
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/dashboard');

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError(err.message || 'Failed to load dashboard');
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <Head>
        <title>Dashboard - PayrollShield</title>
        <meta name="description" content="View payroll review history and audit trail" />
      </Head>

      <Header />

      <main className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Review history and audit trail
              </p>
            </div>
            <Link href="/upload">
              <Button>Upload Payroll</Button>
            </Link>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
              <p className="text-red-800">{error}</p>
              <button
                onClick={fetchDashboardData}
                className="mt-2 text-sm text-red-600 hover:underline"
              >
                Try again
              </button>
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

              {/* Review Sessions — full width */}
              <ReviewSessionsTable
                sessions={data.sessions}
                recentActivity={data.recent_activity}
              />
            </>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
