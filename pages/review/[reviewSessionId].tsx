import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { toast } from 'sonner';
import { BlockerAlert } from '../../components/BlockerAlert';
import { MaterialChangeCard } from '../../components/MaterialChangeCard';
import { ChangeSummaryCards } from '../../components/ChangeSummaryCards';
import { ApprovalActions } from '../../components/ApprovalActions';
import { SkeletonReviewPage } from '../../components/ui/skeleton';
import { Header } from '../../components/Header';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../components/ui/accordion';

interface ReviewData {
  session: {
    review_session_id: string;
    organization_name: string;
    status: string;
    baseline_period: string;
    current_period: string;
    pay_date: string;
    run_type: string;
    created_at: string;
  };
  summary: {
    total_changes: number;
    material_changes: number;
    blockers_count: number;
    approval_status: string;
  };
  blockers: any[];
  material_changes: Record<string, any[]>;
  non_material_changes: any[];
}

function formatMetricLabel(metric: string): string {
  const labels: Record<string, string> = {
    net_pay: 'Net Pay',
    gross_pay: 'Gross Pay',
    total_deductions: 'Deductions',
    component: 'Component',
    regular_hours: 'Regular Hours',
    overtime_hours: 'Overtime Hours',
    other_paid_hours: 'Other Paid Hours',
    total_hours_worked: 'Total Hours',
    base_earnings: 'Base Earnings',
    overtime_pay: 'Overtime Pay',
    bonus_earnings: 'Bonus Earnings',
    other_earnings: 'Other Earnings',
    federal_income_tax: 'Federal Tax',
    social_security_tax: 'Social Security',
    medicare_tax: 'Medicare',
    state_income_tax: 'State Tax',
    local_tax: 'Local Tax',
  };
  return labels[metric] || metric.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function ReviewPage() {
  const router = useRouter();
  const { reviewSessionId } = router.query;

  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reviewSessionId) return;

    fetchReviewData();
  }, [reviewSessionId]);

  const fetchReviewData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/review/${reviewSessionId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch review data');
      }

      const data = await response.json();
      setReviewData(data);
    } catch (err: any) {
      console.error('Error fetching review data:', err);
      setError(err.message || 'Failed to load review data');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      const response = await fetch('/api/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          review_session_id: reviewSessionId,
          approval_status: 'approved',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve payroll');
      }

      // Refresh review data
      await fetchReviewData();
      toast.success('Payroll approved successfully!', {
        description: 'The payroll run has been marked as approved.',
      });
    } catch (err: any) {
      console.error('Approval error:', err);
      throw err;
    }
  };

  const handleReject = async (notes: string) => {
    try {
      const response = await fetch('/api/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          review_session_id: reviewSessionId,
          approval_status: 'rejected',
          approval_notes: notes,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject payroll');
      }

      // Refresh review data
      await fetchReviewData();
      toast.success('Payroll rejected', {
        description: 'The payroll run has been marked as rejected with your notes.',
      });
    } catch (err: any) {
      console.error('Rejection error:', err);
      throw err;
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Head>
          <title>Loading Review - PayrollShield</title>
        </Head>
        <Header />
        <SkeletonReviewPage />
      </ProtectedRoute>
    );
  }

  if (error || !reviewData) {
    return (
      <ProtectedRoute>
        <Head>
          <title>Error - PayrollShield</title>
        </Head>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md bg-white p-8 rounded-lg border shadow-sm">
            <div className="text-red-500 text-5xl mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Review</h1>
            <p className="text-gray-600 mb-6">{error || 'Review data not found'}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => fetchReviewData()}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const { session, summary, blockers, material_changes, non_material_changes } = reviewData;

  return (
    <ProtectedRoute>
      <Head>
        <title>Review Payroll - {session.organization_name}</title>
        <meta name="description" content="Review and approve payroll changes" />
      </Head>

      <Header />

      <div className="min-h-screen bg-gray-50 pb-24">
        {/* Page Header */}
        <div className="bg-white border-b shadow-sm sticky top-12 z-20">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{session.organization_name}</h1>
                <p className="text-gray-600 mt-1">
                  Payroll Review for {session.current_period}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Pay Date: {session.pay_date} • Run Type: {session.run_type}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Compared to</p>
                <p className="font-medium text-gray-900">{session.baseline_period}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Summary Cards */}
          <ChangeSummaryCards summary={summary} />

          {/* Blockers Section */}
          {blockers.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-2xl font-bold text-red-600">Blockers</h2>
                <span className="text-sm text-gray-600">
                  Must resolve before approval ({blockers.length})
                </span>
              </div>
              <div className="space-y-4">
                {blockers.map((blocker, index) => (
                  <BlockerAlert key={index} blocker={blocker} />
                ))}
              </div>
            </section>
          )}

          {/* Material Changes Section */}
          {summary.material_changes > 0 && (
            <section className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-2xl font-bold text-yellow-600">Material Changes</h2>
                <span className="text-sm text-gray-600">
                  Require review ({summary.material_changes})
                </span>
              </div>

              {Object.entries(material_changes)
                .filter(([, changes]) => changes && changes.length > 0)
                .map(([metric, changes]) => (
                  <div key={metric} className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      {formatMetricLabel(metric)} Changes ({changes.length})
                    </h3>
                    <div className="space-y-3">
                      {changes.map((change: any, index: number) => (
                        <MaterialChangeCard key={index} change={change} />
                      ))}
                    </div>
                  </div>
                ))}
            </section>
          )}

          {/* Non-Material Changes Section (Collapsed) */}
          {non_material_changes.length > 0 && (
            <section className="mb-8">
              <Accordion type="single" collapsible className="bg-white rounded-lg border">
                <AccordionItem value="non-material" className="border-0">
                  <AccordionTrigger className="px-6 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-semibold text-gray-700">
                        Non-Material Changes
                      </h2>
                      <span className="text-sm text-gray-500">
                        Minor changes ({non_material_changes.length})
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6">
                    <p className="text-sm text-gray-600 mb-4">
                      These changes are below the materiality threshold and typically don't require
                      detailed review.
                    </p>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {non_material_changes.map((change, index) => (
                        <MaterialChangeCard key={index} change={change} />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </section>
          )}

          {/* Empty State */}
          {summary.total_changes === 0 && (
            <div className="text-center py-12 bg-white rounded-lg border">
              <div className="text-5xl mb-4">✓</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Changes Detected</h3>
              <p className="text-gray-600">
                This payroll matches the previous approved payroll exactly.
              </p>
            </div>
          )}
        </div>

        {/* Approval Actions (Sticky Footer) */}
        <ApprovalActions
          reviewSessionId={session.review_session_id}
          hasBlockers={summary.blockers_count > 0}
          approvalStatus={summary.approval_status}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </div>
    </ProtectedRoute>
  );
}
