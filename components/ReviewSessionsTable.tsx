import React from 'react';
import Link from 'next/link';
import { Badge } from './ui/badge';
import { BarChart2, CheckCircle2 } from 'lucide-react';

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

export function ReviewSessionsTable({ sessions }: ReviewSessionsTableProps) {
  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <BarChart2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No review sessions yet</h3>
        <p className="text-gray-600 mb-4">
          Upload your first payroll comparison to get started.
        </p>
        <Link
          href="/upload"
          className="inline-flex items-center px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark"
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

  const getMergedStatusBadge = (session: ReviewSession) => {
    // Processing states based on session.status
    if (session.status === 'in_progress') {
      return <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100">Processing...</Badge>;
    }
    if (session.status === 'pending_mapping') {
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Awaiting Mapping</Badge>;
    }
    if (session.status === 'failed') {
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Failed</Badge>;
    }
    // Completed sessions — show approval decision
    if (session.approval_status === 'approved') {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
    }
    if (session.approval_status === 'rejected') {
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>;
    }
    // completed + approval pending
    if (session.status === 'completed') {
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Under Review</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100">Under Review</Badge>;
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
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sessions.map((session) => {
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
                    {getMergedStatusBadge(session)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                    <Link
                      href={
                        session.status === 'pending_mapping'
                          ? `/mapping/${session.review_session_id}`
                          : `/review/${session.review_session_id}`
                      }
                      className="text-brand-blue hover:underline font-medium"
                    >
                      {session.status === 'pending_mapping' ? 'Continue' : 'View'}
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
