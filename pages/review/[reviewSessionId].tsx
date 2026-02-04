import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { toast } from 'sonner';
import { Header } from '../../components/Header';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { SkeletonReviewPage } from '../../components/ui/skeleton';
import { VerdictBanner, ReviewSection, FinalizeChecklist } from '../../components/review';
import type { ReviewPageData } from '../../lib/types/review';
import type { UxSection } from '../../lib/rules/uxSectionMapping';
import { CheckCircle2 } from 'lucide-react';

const SECTION_ORDER: { key: UxSection; defaultExpanded: boolean }[] = [
  { key: 'blockers', defaultExpanded: true },
  { key: 'high_risk', defaultExpanded: true },
  { key: 'compliance', defaultExpanded: true },
  { key: 'volatility', defaultExpanded: false },
  { key: 'systemic', defaultExpanded: false },
  { key: 'noise', defaultExpanded: false },
];

export default function ReviewPage() {
  const router = useRouter();
  const { reviewSessionId } = router.query;
  const finalizeRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<ReviewPageData | null>(null);
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
      const json = await response.json();
      setData(json);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_session_id: reviewSessionId,
          approval_status: 'approved',
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to approve payroll');
      }

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_session_id: reviewSessionId,
          approval_status: 'rejected',
          approval_notes: notes,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to reject payroll');
      }

      await fetchReviewData();
      toast.success('Payroll rejected', {
        description: 'The payroll run has been marked as rejected with your notes.',
      });
    } catch (err: any) {
      console.error('Rejection error:', err);
      throw err;
    }
  };

  // Loading state
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

  // Error state
  if (error || !data) {
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

  const { session, verdict, sections } = data;
  const totalFlagged = verdict.total_flagged;

  return (
    <ProtectedRoute>
      <Head>
        <title>Review Payroll - {session.organization_name}</title>
        <meta name="description" content="Review and approve payroll changes" />
      </Head>

      <Header />

      <div className="min-h-screen bg-gray-50 pb-12">
        {/* Page Header */}
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-6">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{session.organization_name}</h1>
                <p className="text-gray-600 mt-1">
                  Payroll Review for {session.current_period}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Pay Date: {session.pay_date} &middot; Run Type: {session.run_type}
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
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
          {/* Verdict Banner */}
          <VerdictBanner verdict={verdict} />

          {/* Sections */}
          {SECTION_ORDER.map(({ key, defaultExpanded }) => (
            <ReviewSection
              key={key}
              section={key}
              items={sections[key]}
              defaultExpanded={defaultExpanded}
            />
          ))}

          {/* Empty State */}
          {totalFlagged === 0 && (
            <div className="text-center py-16 bg-white rounded-lg border">
              <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Issues Detected</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                All payroll data passed validation checks. This payroll run is ready for approval.
              </p>
            </div>
          )}

          {/* Finalize Checklist */}
          <FinalizeChecklist
            ref={finalizeRef}
            reviewSessionId={session.review_session_id}
            verdict={verdict}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}
