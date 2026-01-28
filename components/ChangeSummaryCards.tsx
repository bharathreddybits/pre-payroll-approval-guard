import React from 'react';
import { Card, CardContent } from './ui/card';

interface SummaryProps {
  summary: {
    total_changes: number;
    material_changes: number;
    blockers_count: number;
    approval_status: string;
  };
}

export function ChangeSummaryCards({ summary }: SummaryProps) {
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'approved':
        return { text: 'Approved', color: 'text-green-600' };
      case 'rejected':
        return { text: 'Rejected', color: 'text-red-600' };
      case 'pending':
        return { text: 'Pending', color: 'text-yellow-600' };
      default:
        return { text: 'In Review', color: 'text-gray-600' };
    }
  };

  const statusDisplay = getStatusDisplay(summary.approval_status);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      {/* Total Changes */}
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className="text-4xl font-bold text-gray-900 mb-1">
            {summary.total_changes}
          </div>
          <div className="text-sm text-gray-600 font-medium">Total Changes</div>
          <div className="text-xs text-gray-500 mt-1">Detected changes across all employees</div>
        </CardContent>
      </Card>

      {/* Material Changes */}
      <Card className="border-l-4 border-l-yellow-500 hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className="text-4xl font-bold text-yellow-600 mb-1">
            {summary.material_changes}
          </div>
          <div className="text-sm text-gray-600 font-medium">Material Changes</div>
          <div className="text-xs text-gray-500 mt-1">Require your review</div>
        </CardContent>
      </Card>

      {/* Blockers */}
      <Card className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className="text-4xl font-bold text-red-600 mb-1">
            {summary.blockers_count}
          </div>
          <div className="text-sm text-gray-600 font-medium">Blockers</div>
          <div className="text-xs text-gray-500 mt-1">
            {summary.blockers_count > 0 ? 'Must resolve before approval' : 'None detected'}
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className={`text-2xl font-bold ${statusDisplay.color} mb-1`}>
            {statusDisplay.text}
          </div>
          <div className="text-sm text-gray-600 font-medium">Approval Status</div>
          <div className="text-xs text-gray-500 mt-1">
            {summary.approval_status === 'pending' && summary.blockers_count === 0
              ? 'Ready for approval'
              : summary.approval_status === 'pending'
              ? 'Resolve blockers first'
              : 'Review complete'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
