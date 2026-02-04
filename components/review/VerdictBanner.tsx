import React from 'react';
import { ShieldX, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Verdict } from '../../lib/types/review';

interface VerdictBannerProps {
  verdict: Verdict;
}

export function VerdictBanner({ verdict }: VerdictBannerProps) {
  const config = {
    blocked: {
      bg: 'bg-red-600',
      icon: <ShieldX className="h-7 w-7 text-white" />,
      title: `${verdict.blockers_count} issue${verdict.blockers_count !== 1 ? 's' : ''} must be resolved before approval`,
      subtitle: 'BLOCKED',
    },
    review_required: {
      bg: 'bg-amber-500',
      icon: <AlertTriangle className="h-7 w-7 text-white" />,
      title: `${verdict.reviews_count} item${verdict.reviews_count !== 1 ? 's' : ''} flagged for review`,
      subtitle: 'REVIEW REQUIRED',
    },
    ready_to_approve: {
      bg: 'bg-green-600',
      icon: <CheckCircle2 className="h-7 w-7 text-white" />,
      title: 'No issues detected',
      subtitle: 'READY TO APPROVE',
    },
  }[verdict.status];

  return (
    <div className={`${config.bg} text-white`}>
      <div className="max-w-7xl mx-auto px-4 py-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {config.icon}
            <div>
              <p className="text-sm font-medium uppercase tracking-wider opacity-90">
                {config.subtitle}
              </p>
              <p className="text-lg font-semibold">{config.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {verdict.blockers_count > 0 && (
              <span className="bg-white/20 rounded-full px-3 py-1 font-medium">
                {verdict.blockers_count} Blocker{verdict.blockers_count !== 1 ? 's' : ''}
              </span>
            )}
            {verdict.reviews_count > 0 && (
              <span className="bg-white/20 rounded-full px-3 py-1 font-medium">
                {verdict.reviews_count} Review{verdict.reviews_count !== 1 ? 's' : ''}
              </span>
            )}
            {verdict.info_count > 0 && (
              <span className="bg-white/20 rounded-full px-3 py-1 font-medium">
                {verdict.info_count} Info
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
