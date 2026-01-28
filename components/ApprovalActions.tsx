import React, { useState } from 'react';
import { Button } from './ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import { Textarea } from './ui/textarea';

interface ApprovalActionsProps {
  reviewSessionId: string;
  hasBlockers: boolean;
  approvalStatus: string;
  onApprove: () => Promise<void>;
  onReject: (notes: string) => Promise<void>;
}

export function ApprovalActions({
  reviewSessionId,
  hasBlockers,
  approvalStatus,
  onApprove,
  onReject,
}: ApprovalActionsProps) {
  const [rejectNotes, setRejectNotes] = useState('');
  const [approveConfirmed, setApproveConfirmed] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const handleApprove = async () => {
    if (!approveConfirmed) {
      return;
    }

    setIsApproving(true);
    try {
      await onApprove();
      setShowApproveDialog(false);
    } catch (error) {
      console.error('Approval failed:', error);
      alert('Failed to approve payroll. Please try again.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (rejectNotes.length < 10) {
      return;
    }

    setIsRejecting(true);
    try {
      await onReject(rejectNotes);
      setShowRejectDialog(false);
      setRejectNotes('');
    } catch (error) {
      console.error('Rejection failed:', error);
      alert('Failed to reject payroll. Please try again.');
    } finally {
      setIsRejecting(false);
    }
  };

  // Don't show actions if already approved or rejected
  if (approvalStatus === 'approved' || approvalStatus === 'rejected') {
    return (
      <div className="sticky bottom-0 bg-white border-t p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-center items-center">
          <div
            className={`text-lg font-semibold ${
              approvalStatus === 'approved' ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {approvalStatus === 'approved'
              ? '✓ Payroll has been approved'
              : '✗ Payroll has been rejected'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky bottom-0 bg-white border-t p-4 shadow-lg z-10">
      <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-4">
        <div className="text-sm text-gray-600">
          {hasBlockers ? (
            <span className="text-red-600 font-medium flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              Resolve all blockers before approving
            </span>
          ) : (
            <span className="text-green-600 font-medium flex items-center gap-2">
              <span className="text-xl">✓</span>
              Ready for approval
            </span>
          )}
        </div>

        <div className="flex gap-3">
          {/* Reject Dialog */}
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
                  Please provide detailed notes explaining why this payroll is being rejected. This
                  will be recorded in the audit trail.
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

          {/* Approve Dialog */}
          <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
            <AlertDialogTrigger asChild>
              <Button
                variant="default"
                size="lg"
                disabled={hasBlockers}
                className="bg-green-600 hover:bg-green-700"
              >
                Approve Payroll
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Approve this payroll?</AlertDialogTitle>
                <AlertDialogDescription>
                  By approving, you confirm that you have reviewed all material changes and are
                  authorizing this payroll to be processed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="my-4">
                <label className="flex items-center gap-3 cursor-pointer p-3 border rounded hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={approveConfirmed}
                    onChange={(e) => setApproveConfirmed(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="text-sm">
                    I confirm I have reviewed all material changes and approve this payroll for
                    processing
                  </span>
                </label>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setApproveConfirmed(false)}>
                  Cancel
                </AlertDialogCancel>
                <Button
                  onClick={handleApprove}
                  disabled={!approveConfirmed || isApproving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isApproving ? 'Approving...' : 'Confirm Approval'}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
