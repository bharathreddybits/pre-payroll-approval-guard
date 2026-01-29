import React from 'react';

interface DashboardStatsProps {
  stats: {
    total_reviews: number;
    approved: number;
    rejected: number;
    pending: number;
  };
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const cards = [
    {
      label: 'Total Reviews',
      value: stats.total_reviews,
      color: 'gray',
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-900',
    },
    {
      label: 'Approved',
      value: stats.approved,
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      borderColor: 'border-l-4 border-green-500',
    },
    {
      label: 'Rejected',
      value: stats.rejected,
      color: 'red',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      borderColor: 'border-l-4 border-red-500',
    },
    {
      label: 'Pending',
      value: stats.pending,
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700',
      borderColor: 'border-l-4 border-yellow-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`bg-white rounded-lg border p-4 ${card.borderColor || ''}`}
        >
          <p className="text-sm font-medium text-gray-600">{card.label}</p>
          <p className={`text-3xl font-bold mt-1 ${card.textColor}`}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
