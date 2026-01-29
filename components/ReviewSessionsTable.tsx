import React from 'react';
import Link from 'next/link';
import { Badge } from './ui/badge';

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

interface ReviewSessionsTableProps {
  sessions: ReviewSession[];
}

export function ReviewSessionsTable({ sessions }: ReviewSessionsTableProps) {
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
      <div className="px-4 py-3 border-b">
        <h3 className="text-lg font-semibold text-gray-900">Review Sessions</h3>
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
            {sessions.map((session) => (
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
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                  <Link
                    href={`/review/${session.review_session_id}`}
                    className="text-primary hover:underline font-medium"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
