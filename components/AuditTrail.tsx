import React from 'react';
import Link from 'next/link';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

interface ActivityItem {
  approval_id: string;
  review_session_id: string;
  organization_name: string;
  period: string;
  approval_status: string;
  approval_notes: string | null;
  approved_at: string;
  approved_by: string | null;
}

interface AuditTrailProps {
  activity: ActivityItem[];
}

function relativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatFullDate(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AuditTrail({ activity }: AuditTrailProps) {
  if (activity.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Audit Log</h3>
        <div className="flex flex-col items-center py-6 text-center">
          <Clock className="h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No decisions recorded yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Approve or reject a payroll review to see the audit trail here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border">
      <div className="px-4 py-3 border-b">
        <h3 className="text-lg font-semibold text-gray-900">Audit Log</h3>
        <p className="text-xs text-gray-400 mt-0.5">Decisions &amp; notes</p>
      </div>

      <div className="px-4 py-2">
        {activity.map((item, i) => {
          const isApproved = item.approval_status === 'approved';
          const isLast = i === activity.length - 1;

          return (
            <div key={item.approval_id} className="relative flex gap-3">
              {/* Timeline line */}
              {!isLast && (
                <div className="absolute left-[13px] top-8 bottom-0 w-px bg-gray-200" />
              )}

              {/* Icon */}
              <div className="relative z-10 flex-shrink-0 mt-1">
                {isApproved ? (
                  <CheckCircle2 className="h-[26px] w-[26px] text-green-500" />
                ) : (
                  <XCircle className="h-[26px] w-[26px] text-red-500" />
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 pb-5 ${isLast ? '' : ''}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900">
                    {isApproved ? 'Approved' : 'Rejected'}
                  </p>
                  <span
                    className="text-[11px] text-gray-400 flex-shrink-0"
                    title={formatFullDate(item.approved_at)}
                  >
                    {relativeTime(item.approved_at)}
                  </span>
                </div>

                <p className="text-xs text-gray-500 mt-0.5">
                  {item.organization_name} &middot; {item.period}
                </p>

                {item.approved_by && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    by {item.approved_by}
                  </p>
                )}

                {item.approval_notes && (
                  <div className="mt-2 px-3 py-2 bg-gray-50 rounded-md border border-gray-100">
                    <p className="text-xs text-gray-600 leading-relaxed">
                      &ldquo;{item.approval_notes}&rdquo;
                    </p>
                  </div>
                )}

                <Link
                  href={`/review/${item.review_session_id}`}
                  className="inline-block mt-1.5 text-xs text-primary hover:underline"
                >
                  View review
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
