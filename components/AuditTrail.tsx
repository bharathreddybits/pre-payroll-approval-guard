import React from 'react';
import Link from 'next/link';

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

export function AuditTrail({ activity }: AuditTrailProps) {
  if (activity.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-6 text-center">
        <p className="text-gray-500">No recent activity</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-lg border">
      <div className="px-4 py-3 border-b">
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
      </div>
      <div className="divide-y">
        {activity.map((item) => (
          <div key={item.approval_id} className="px-4 py-3 hover:bg-gray-50">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                    item.approval_status === 'approved'
                      ? 'bg-green-500'
                      : 'bg-red-500'
                  }`}
                />
                <div>
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{item.organization_name}</span>
                    {' payroll '}
                    <span
                      className={`font-medium ${
                        item.approval_status === 'approved'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {item.approval_status}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Period: {item.period}
                  </p>
                  {item.approval_notes && (
                    <p className="text-xs text-gray-600 mt-1 italic">
                      "{item.approval_notes}"
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-gray-500">{formatDate(item.approved_at)}</p>
                <Link
                  href={`/review/${item.review_session_id}`}
                  className="text-xs text-primary hover:underline"
                >
                  View
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
