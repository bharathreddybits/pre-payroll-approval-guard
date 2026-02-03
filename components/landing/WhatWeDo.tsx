import React from 'react';
import { GitCompare, ListChecks, BarChart3, ClipboardCheck } from 'lucide-react';
import { useInView } from '../../hooks/useInView';

const steps = [
  {
    icon: GitCompare,
    title: 'Compares',
    description: 'Compares the current payroll to the last approved payroll',
  },
  {
    icon: ListChecks,
    title: 'Applies 60+ Rules',
    description: 'Applies 60+ deterministic payroll judgments',
  },
  {
    icon: BarChart3,
    title: 'Assigns Severity',
    description: 'Assigns Severity (Blocker / Review / Info) and Confidence (how often this is a real error in practice)',
  },
  {
    icon: ClipboardCheck,
    title: 'Produces Actions',
    description: 'Produces explicit reviewer actions for every flag',
  },
];

export function WhatWeDo() {
  const { ref, isVisible } = useInView({ threshold: 0.1 });

  return (
    <section ref={ref} className="py-20 lg:py-28 bg-slate-50/70">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className={`max-w-3xl mx-auto text-center mb-16 scroll-fade-in ${isVisible ? 'is-visible' : ''}`}>
          <p className="text-sm font-semibold text-brand-blue uppercase tracking-widest mb-4">
            What PayrollShield Does
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 mb-6">
            A Pre-Payroll Judgment Engine
          </h2>
          <p className="text-lg text-slate-500">
            Before payroll runs, PayrollShield:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto mb-16">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className={`bg-white rounded-2xl p-6 border border-slate-200/60 text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300 scroll-fade-in scroll-delay-${Math.min(i + 1, 5)} ${isVisible ? 'is-visible' : ''}`}
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-brand-blue/15 to-brand-blue/5 text-brand-blue mb-4">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{step.description}</p>
              </div>
            );
          })}
        </div>

        {/* Bottom callout */}
        <div className={`max-w-2xl mx-auto scroll-fade-in scroll-delay-5 ${isVisible ? 'is-visible' : ''}`}>
          <div className="bg-white rounded-2xl p-8 border border-slate-200/60 shadow-sm">
            <div className="space-y-3 text-center">
              <p className="text-slate-500">No auto-blocking. No black box.</p>
              <p className="text-lg font-semibold text-slate-900">
                Every flag is explainable and auditable.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
