import React from 'react';
import {
  UserCheck, Clock, DollarSign, Receipt, FileStack, GitCompare,
} from 'lucide-react';
import { useInView } from '../../hooks/useInView';

const categories = [
  {
    icon: UserCheck,
    title: 'Identity & Context',
    accent: 'blue' as const,
    items: [
      'Inactive employees being paid',
      'Duplicate employee records',
      'Missing employee IDs',
      'Employment status changes',
      'Pay frequency or pay group changes',
    ],
  },
  {
    icon: Clock,
    title: 'Hours & Time',
    accent: 'red' as const,
    items: [
      'Zero hours with pay',
      'Negative hours',
      'Hours exceeding legal maximums',
      'Overtime without regular hours',
      'Paid hours exceeding total hours',
    ],
  },
  {
    icon: DollarSign,
    title: 'Earnings',
    accent: 'blue' as const,
    items: [
      'Base pay drops or spikes',
      'Overtime pay without overtime hours',
      'Bonuses appearing unexpectedly',
      'Negative earnings',
      'Earnings without employee mapping',
    ],
  },
  {
    icon: Receipt,
    title: 'Taxes',
    accent: 'red' as const,
    items: [
      'Missing federal, FICA, or state tax',
      'Negative taxes',
      'Tax spikes or drops beyond norms',
      'Local tax inconsistencies',
    ],
  },
  {
    icon: FileStack,
    title: 'Deductions',
    accent: 'blue' as const,
    items: [
      'Deductions exceeding gross',
      'New or missing deductions',
      'Negative deductions',
      '401(k) IRS limit violations',
    ],
  },
  {
    icon: GitCompare,
    title: 'Cross-Checks',
    accent: 'red' as const,
    items: [
      'Gross \u2260 earnings',
      'Gross \u2212 taxes \u2212 deductions \u2260 net',
      'Net pay negative or implausible',
    ],
  },
];

const accentStyles = {
  blue: {
    iconBg: 'bg-gradient-to-br from-brand-blue/15 to-brand-blue/5 text-brand-blue',
    border: 'hover:border-brand-blue/20',
    dot: 'bg-brand-blue',
  },
  red: {
    iconBg: 'bg-gradient-to-br from-brand-red/15 to-brand-red/5 text-brand-red',
    border: 'hover:border-brand-red/20',
    dot: 'bg-brand-red',
  },
};

export function WhatWeFlag() {
  const { ref, isVisible } = useInView({ threshold: 0.05 });

  return (
    <section ref={ref} className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className={`max-w-3xl mx-auto text-center mb-16 scroll-fade-in ${isVisible ? 'is-visible' : ''}`}>
          <p className="text-sm font-semibold text-brand-red uppercase tracking-widest mb-4">
            What We Flag
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 mb-6">
            Real rules, real risk
          </h2>
          <p className="text-lg text-slate-500">
            These are the exact scenarios that trigger reruns and audits.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat, i) => {
            const Icon = cat.icon;
            const styles = accentStyles[cat.accent];
            return (
              <div
                key={cat.title}
                className={`bg-white rounded-2xl p-6 border border-slate-200/60 ${styles.border} hover:shadow-lg transition-all duration-300 scroll-fade-in scroll-delay-${Math.min(i + 1, 5)} ${isVisible ? 'is-visible' : ''}`}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${styles.iconBg}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-slate-900">{cat.title}</h3>
                </div>
                <ul className="space-y-2.5">
                  {cat.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${styles.dot} mt-2`} />
                      <span className="text-sm text-slate-600">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
