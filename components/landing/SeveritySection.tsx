import React from 'react';
import { ShieldX, Eye, Info } from 'lucide-react';
import { useInView } from '../../hooks/useInView';

const severities = [
  {
    level: 'Blocker',
    icon: ShieldX,
    color: 'red',
    bg: 'bg-red-50',
    border: 'border-red-200',
    iconColor: 'text-brand-red',
    badgeBg: 'bg-brand-red',
    items: [
      'Negative net pay',
      'Inactive employee paid',
      'Taxes missing',
      'Deductions exceed gross',
      'Payroll math doesn\u2019t reconcile',
    ],
  },
  {
    level: 'Review',
    icon: Eye,
    color: 'amber',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    iconColor: 'text-amber-600',
    badgeBg: 'bg-amber-500',
    items: [
      'Pay spikes or drops',
      'New deductions or bonuses',
      'Tax anomalies',
      'Hours changes beyond baseline',
    ],
  },
  {
    level: 'Info',
    icon: Info,
    color: 'blue',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconColor: 'text-brand-blue',
    badgeBg: 'bg-brand-blue',
    items: [
      'Data completeness issues',
      'Expected but notable changes',
    ],
  },
];

export function SeveritySection() {
  const { ref, isVisible } = useInView({ threshold: 0.1 });

  return (
    <section ref={ref} className="py-20 lg:py-28 bg-slate-50/70">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className={`max-w-3xl mx-auto text-center mb-16 scroll-fade-in ${isVisible ? 'is-visible' : ''}`}>
          <p className="text-sm font-semibold text-brand-blue uppercase tracking-widest mb-4">
            Severity You Can Trust
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 mb-6">
            Not all payroll issues are equal &mdash; and we prove it
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {severities.map((sev, i) => {
            const Icon = sev.icon;
            return (
              <div
                key={sev.level}
                className={`rounded-2xl p-6 ${sev.bg} border ${sev.border} scroll-fade-in scroll-delay-${i + 1} ${isVisible ? 'is-visible' : ''}`}
              >
                <div className="flex items-center gap-3 mb-5">
                  <Icon className={`h-6 w-6 ${sev.iconColor}`} />
                  <span className={`px-3 py-1 ${sev.badgeBg} text-white text-sm font-semibold rounded-full`}>
                    {sev.level}
                  </span>
                </div>
                <ul className="space-y-2.5">
                  {sev.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-sm text-slate-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className={`max-w-2xl mx-auto mt-12 text-center scroll-fade-in scroll-delay-4 ${isVisible ? 'is-visible' : ''}`}>
          <p className="text-lg text-slate-500 leading-relaxed">
            Severity reflects <span className="font-semibold text-slate-900">real escalation risk</span>, not anomaly math.
          </p>
        </div>
      </div>
    </section>
  );
}
