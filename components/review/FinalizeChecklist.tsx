import React, { useState, forwardRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import { Textarea } from '../ui/textarea';
import { CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Verdict } from '../../lib/types/review';

interface FinalizeChecklistProps {
  reviewSessionId: string;
  verdict: Verdict;
  onApprove: () => Promise<void>;
  onReject: (notes: string) => Promise<void>;
}

export const FinalizeChecklist = forwardRef<HTMLDivElement, FinalizeChecklistProps>(
  function FinalizeChecklist({ reviewSessionId, verdict, onApprove, onReject }, ref) {
    const [blockersAcknowledged, setBlockersAcknowledged] = useState(false);
    const [materialReviewed, setMaterialReviewed] = useState(false);
    const [noBackdatedImpact, setNoBackdatedImpact] = useState(false);
    const [rejectNotes, setRejectNotes] = useState('');
    const [isApproving, setIsApproving] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);

    const hasBlockers = verdict.blockers_count > 0;
    const blockersResolved = hasBlockers ? blockersAcknowledged : true;
    const materialCount = verdict.reviews_count;

    const allChecked = blockersResolved && materialReviewed && noBackdatedImpact;
    const canApprove = allChecked;

    // Already approved or rejected
    if (verdict.approval_status === 'approved' || verdict.approval_status === 'rejected') {
      return (
        <div ref={ref}>
          <Card className={`${verdict.approval_status === 'approved' ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
            <CardContent className="py-6">
              <div className="flex items-center justify-center gap-3">
                {verdict.approval_status === 'approved' ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600" />
                )}
                <span className={`text-lg font-semibold ${verdict.approval_status === 'approved' ? 'text-green-700' : 'text-red-700'}`}>
                  Payroll has been {verdict.approval_status}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    const handleApprove = async () => {
      setIsApproving(true);
      try {
        await onApprove();
      } catch (error) {
        console.error('Approval failed:', error);
        toast.error('Approval failed', {
          description: 'Please try again or contact support.',
        });
      } finally {
        setIsApproving(false);
      }
    };

    const handleReject = async () => {
      if (rejectNotes.length < 10) return;
      setIsRejecting(true);
      try {
        await onReject(rejectNotes);
        setShowRejectDialog(false);
        setRejectNotes('');
      } catch (error) {
        console.error('Rejection failed:', error);
        toast.error('Rejection failed', {
          description: 'Please try again or contact support.',
        });
      } finally {
        setIsRejecting(false);
      }
    };

    return (
      <div ref={ref}>
        <Card className="border-2 border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl text-gray-900">Before you finalize</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Checkbox 1: Blockers resolved */}
            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${
              blockersResolved
                ? 'bg-green-50 border-green-200'
                : hasBlockers
                  ? 'bg-red-50 border-red-200 hover:bg-red-100'
                  : 'bg-green-50 border-green-200'
            }`}>
              <input
                type="checkbox"
                checked={blockersResolved}
                disabled={!hasBlockers}
                onChange={(e) => setBlockersAcknowledged(e.target.checked)}
                className="mt-0.5 w-5 h-5"
              />
              <div>
                <span className={`text-sm font-medium ${blockersResolved ? 'text-green-800' : 'text-red-800'}`}>
                  All blockers reviewed & resolved
                </span>
                <p className={`text-xs ${blockersResolved ? 'text-green-600' : 'text-red-600'}`}>
                  {hasBlockers
                    ? blockersAcknowledged
                      ? `${verdict.blockers_count} blocker${verdict.blockers_count !== 1 ? 's' : ''} acknowledged as resolved`
                      : `${verdict.blockers_count} blocker${verdict.blockers_count !== 1 ? 's' : ''} require your review`
                    : 'No blockers detected'}
                </p>
              </div>
            </label>

            {/* Checkbox 2: Material items reviewed */}
            <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={materialReviewed}
                onChange={(e) => setMaterialReviewed(e.target.checked)}
                className="mt-0.5 w-5 h-5"
              />
              <div>
                <span className="text-sm font-medium text-gray-800">
                  {materialCount > 0
                    ? `${materialCount} material item${materialCount !== 1 ? 's' : ''} reviewed & acknowledged`
                    : 'All material items reviewed & acknowledged'}
                </span>
                <p className="text-xs text-gray-500">
                  Confirm you have reviewed flagged changes above
                </p>
              </div>
            </label>

            {/* Checkbox 3: No backdated impact */}
            <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={noBackdatedImpact}
                onChange={(e) => setNoBackdatedImpact(e.target.checked)}
                className="mt-0.5 w-5 h-5"
              />
              <div>
                <span className="text-sm font-medium text-gray-800">
                  No statutory backdated impact
                </span>
                <p className="text-xs text-gray-500">
                  Confirm changes do not create retroactive compliance issues
                </p>
              </div>
            </label>

            {/* Action buttons */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t">
              <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="lg">
                    Reject Payroll
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reject this payroll?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Provide detailed notes explaining why this payroll is being rejected.
                      This will be recorded in the audit trail.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Textarea
                    placeholder="Rejection notes (required, minimum 10 characters)"
                    value={rejectNotes}
                    onChange={(e) => setRejectNotes(e.target.value)}
                    className="mt-4 min-h-[120px]"
                  />
                  <div className="text-sm text-gray-500 mt-1">
                    {rejectNotes.length}/10 characters minimum
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <Button
                      variant="destructive"
                      onClick={handleReject}
                      disabled={rejectNotes.length < 10 || isRejecting}
                    >
                      {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button
                size="lg"
                onClick={handleApprove}
                disabled={!canApprove || isApproving}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isApproving ? 'Finalizing...' : 'Finalize with Confidence'}
              </Button>
            </div>

            {!canApprove && (
              <p className="text-xs text-gray-400 text-center">
                Check all boxes above to enable finalization
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
);
