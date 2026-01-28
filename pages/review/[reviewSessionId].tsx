import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { BlockerAlert } from '../../components/BlockerAlert';
import { MaterialChangeCard } from '../../components/MaterialChangeCard';
import { ChangeSummaryCards } from '../../components/ChangeSummaryCards';
import { ApprovalActions } from '../../components/ApprovalActions';
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
  material_changes: {
    net_pay?: any[];
    gross_pay?: any[];
    total_deductions?: any[];
    component?: any[];
  };
  non_material_changes: any[];
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
      alert('Payroll approved successfully!');
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
      alert('Payroll rejected successfully!');
    } catch (err: any) {
      console.error('Rejection error:', err);
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading review data...</p>
        </div>
      </div>
    );
  }

  if (error || !reviewData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Review</h1>
          <p className="text-gray-600 mb-4">{error || 'Review data not found'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  const { session, summary, blockers, material_changes, non_material_changes } = reviewData;

  return (
    <>
      <Head>
        <title>Review Payroll - {session.organization_name}</title>
        <meta name="description" content="Review and approve payroll changes" />
      </Head>

      <div className="min-h-screen bg-gray-50 pb-24">
        {/* Header */}
        <div className="bg-white border-b shadow-sm sticky top-0 z-20">
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

              {/* Group by change type */}
              {material_changes.net_pay && material_changes.net_pay.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Net Pay Changes ({material_changes.net_pay.length})
                  </h3>
                  <div className="space-y-3">
                    {material_changes.net_pay.map((change, index) => (
                      <MaterialChangeCard key={index} change={change} />
                    ))}
                  </div>
                </div>
              )}

              {material_changes.gross_pay && material_changes.gross_pay.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Gross Pay Changes ({material_changes.gross_pay.length})
                  </h3>
                  <div className="space-y-3">
                    {material_changes.gross_pay.map((change, index) => (
                      <MaterialChangeCard key={index} change={change} />
                    ))}
                  </div>
                </div>
              )}

              {material_changes.total_deductions && material_changes.total_deductions.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Deduction Changes ({material_changes.total_deductions.length})
                  </h3>
                  <div className="space-y-3">
                    {material_changes.total_deductions.map((change, index) => (
                      <MaterialChangeCard key={index} change={change} />
                    ))}
                  </div>
                </div>
              )}

              {material_changes.component && material_changes.component.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Component Changes ({material_changes.component.length})
                  </h3>
                  <div className="space-y-3">
                    {material_changes.component.map((change, index) => (
                      <MaterialChangeCard key={index} change={change} />
                    ))}
                  </div>
                </div>
              )}
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
    </>
  );
}
