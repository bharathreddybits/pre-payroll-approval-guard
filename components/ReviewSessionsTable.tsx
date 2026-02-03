import React from 'react';
import Link from 'next/link';
import { Badge } from './ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';

interface ReviewSession {
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
}

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

interface ReviewSessionsTableProps {
  sessions: ReviewSession[];
  recentActivity?: ActivityItem[];
}

export function ReviewSessionsTable({ sessions, recentActivity }: ReviewSessionsTableProps) {
  // Build a lookup from session id to its activity (approval notes, approved_by)
  const activityBySession = new Map<string, ActivityItem>();
  if (recentActivity) {
    for (const item of recentActivity) {
      // Keep the most recent activity per session
      if (!activityBySession.has(item.review_session_id)) {
        activityBySession.set(item.review_session_id, item);
      }
    }
  }

  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <div className="text-4xl mb-4">📊</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No review sessions yet</h3>
        <p className="text-gray-600 mb-4">
          Upload your first payroll comparison to get started.
        </p>
        <Link
          href="/upload"
          className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
        >
          Upload Payroll
        </Link>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
    }
  };

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Review Sessions</h3>
          <p className="text-xs text-gray-500 mt-0.5">All payroll reviews and audit decisions</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Organization
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Period
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Changes
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Material
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Blockers
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Decision
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sessions.map((session) => {
              const activity = activityBySession.get(session.review_session_id);

              return (
                <tr key={session.review_session_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(session.created_at)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {session.organization_name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {session.period}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-center">
                    {session.total_changes}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    <span className={session.material_changes > 0 ? 'text-yellow-600 font-medium' : 'text-gray-400'}>
                      {session.material_changes}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    <span className={session.blockers > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                      {session.blockers}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    {getStatusBadge(session.approval_status)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[220px]">
                    {activity ? (
                      <div className="flex items-start gap-1.5">
                        {activity.approval_status === 'approved' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">
                            {activity.approved_by || 'User'} &middot; {formatDateTime(activity.approved_at)}
                          </p>
                          {activity.approval_notes && (
                            <p className="text-xs text-gray-400 truncate mt-0.5" title={activity.approval_notes}>
                              {activity.approval_notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">&mdash;</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                    <Link
                      href={`/review/${session.review_session_id}`}
                      className="text-primary hover:underline font-medium"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
