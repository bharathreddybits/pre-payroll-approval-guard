import React from 'react';
import { useInView } from '../../hooks/useInView';

const questions = [
  'Should this employee be paid at all?',
  'Does this change make sense compared to last payroll?',
  'Is this legally or financially possible?',
  'Would a senior payroll reviewer approve this?',
];

export function WhySystemsMiss() {
  const { ref, isVisible } = useInView({ threshold: 0.1 });

  return (
    <section ref={ref} className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left column — the argument */}
          <div className={`scroll-fade-in ${isVisible ? 'is-visible' : ''}`}>
            <p className="text-sm font-semibold text-brand-blue uppercase tracking-widest mb-4">
              Why Existing Systems Miss This
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-6">
              Payroll systems calculate.{' '}
              <span className="text-brand-red">They don&apos;t judge.</span>
            </h2>
            <div className="space-y-4 text-slate-500 leading-relaxed">
              <p>
                Most payroll platforms only check whether inputs are valid.
                They don&apos;t check whether results are <span className="font-medium text-slate-700">acceptable</span>.
              </p>
            </div>
          </div>

          {/* Right column — the questions */}
          <div className={`scroll-fade-in scroll-delay-2 ${isVisible ? 'is-visible' : ''}`}>
            <p className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-6">
              They don&apos;t ask:
            </p>
            <div className="space-y-4">
              {questions.map((q, i) => (
                <div
                  key={q}
                  className={`flex items-start gap-3 p-4 rounded-xl bg-blue-50/60 border border-blue-100/60 scroll-fade-in scroll-delay-${Math.min(i + 2, 5)} ${isVisible ? 'is-visible' : ''}`}
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center text-xs font-bold mt-0.5">
                    ?
                  </span>
                  <p className="text-slate-700 font-medium">{q}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 p-5 rounded-xl bg-gradient-to-r from-brand-blue/5 to-brand-red/5 border border-slate-200/60">
              <p className="text-lg font-semibold text-slate-900">
                PayrollShield exists in that gap.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
