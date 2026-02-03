import React from 'react';
import {
  UserX, TrendingUp, AlertTriangle, MinusCircle, DollarSign, Clock, Calculator,
} from 'lucide-react';
import { useInView } from '../../hooks/useInView';

const problems = [
  { icon: UserX, text: 'An inactive employee gets paid' },
  { icon: TrendingUp, text: 'Gross pay spikes without explanation' },
  { icon: AlertTriangle, text: 'Taxes are missing or negative' },
  { icon: MinusCircle, text: 'Deductions exceed gross' },
  { icon: DollarSign, text: 'Net pay goes negative' },
  { icon: Clock, text: 'Hours exceed legal limits' },
  { icon: Calculator, text: 'Payroll math technically "passes" — but is wrong' },
];

export function TheProblem() {
  const { ref, isVisible } = useInView({ threshold: 0.1 });

  return (
    <section ref={ref} className="py-20 lg:py-28 bg-slate-50/70">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className={`max-w-3xl mx-auto text-center mb-16 scroll-fade-in ${isVisible ? 'is-visible' : ''}`}>
          <p className="text-sm font-semibold text-brand-red uppercase tracking-widest mb-4">
            The Problem
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 mb-6">
            Every payroll team has seen this happen
          </h2>
        </div>

        <div className="max-w-2xl mx-auto space-y-4">
          {problems.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={item.text}
                className={`flex items-center gap-4 bg-white rounded-xl p-5 border border-slate-200/60 hover:border-brand-red/20 hover:shadow-md transition-all duration-300 scroll-fade-in scroll-delay-${Math.min(i + 1, 5)} ${isVisible ? 'is-visible' : ''}`}
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-brand-red" />
                </div>
                <p className="text-slate-700 font-medium">{item.text}</p>
              </div>
            );
          })}
        </div>

        <div className={`max-w-2xl mx-auto mt-12 text-center scroll-fade-in scroll-delay-5 ${isVisible ? 'is-visible' : ''}`}>
          <p className="text-lg text-slate-500 leading-relaxed">
            These issues don&apos;t fail payroll systems.
          </p>
          <p className="text-xl font-semibold text-slate-900 mt-1">
            They fail payroll teams.
          </p>
        </div>
      </div>
    </section>
  );
}
