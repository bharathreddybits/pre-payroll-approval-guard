import React from 'react';
import { useInView } from '../../hooks/useInView';

const objections = [
  {
    objection: '"We already review payroll manually"',
    response: 'PayrollShield encodes what senior reviewers check mentally \u2014 but consistently, every run. No steps missed. No rules forgotten.',
  },
  {
    objection: '"AI in payroll is risky"',
    response: 'No decisions are automated. Every rule is deterministic, explainable, and auditable. You can literally inspect the rule table.',
  },
  {
    objection: '"False positives slow us down"',
    response: 'Only material deltas trigger Review or Blocker severity. Informational items never block payroll. Signal, not noise.',
  },
  {
    objection: '"What if it misses something?"',
    response: 'Confidence scores expose uncertainty instead of hiding it. Unknown risk is surfaced \u2014 not ignored.',
  },
];

export function ObjectionPreEmption() {
  const { ref, isVisible } = useInView({ threshold: 0.1 });

  return (
    <section ref={ref} className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className={`max-w-3xl mx-auto text-center mb-16 scroll-fade-in ${isVisible ? 'is-visible' : ''}`}>
          <p className="text-sm font-semibold text-brand-red uppercase tracking-widest mb-4">
            Common Questions
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-6">
            We&apos;ve heard these before
          </h2>
        </div>

        <div className="max-w-3xl mx-auto space-y-6">
          {objections.map((item, i) => (
            <div
              key={item.objection}
              className={`bg-white rounded-2xl p-6 border border-slate-200/60 hover:shadow-md transition-all duration-300 scroll-fade-in scroll-delay-${Math.min(i + 1, 4)} ${isVisible ? 'is-visible' : ''}`}
            >
              <p className="text-lg font-semibold text-slate-900 mb-3">{item.objection}</p>
              <p className="text-slate-500 leading-relaxed">{item.response}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
