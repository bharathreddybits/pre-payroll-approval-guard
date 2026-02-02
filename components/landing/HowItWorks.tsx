import React from 'react';
import { Upload, FileSearch, CircleCheckBig } from 'lucide-react';
import { useInView } from '../../hooks/useInView';

const steps = [
  {
    number: '01',
    icon: Upload,
    title: 'Upload your payroll files',
    description:
      'Drop your baseline and current payroll CSV files. All major payroll export formats are supported out of the box.',
    accent: 'text-brand-blue',
    iconBg: 'bg-gradient-to-br from-brand-blue/15 to-brand-blue/5 text-brand-blue',
    dotColor: 'bg-brand-blue',
  },
  {
    number: '02',
    icon: FileSearch,
    title: 'Review flagged changes',
    description:
      'Material changes, anomalies, and blockers are automatically surfaced in a single review screen with clear explanations.',
    accent: 'text-brand-red',
    iconBg: 'bg-gradient-to-br from-brand-red/15 to-brand-red/5 text-brand-red',
    dotColor: 'bg-brand-red',
  },
  {
    number: '03',
    icon: CircleCheckBig,
    title: 'Approve with confidence',
    description:
      'Resolve any issues, add notes, and approve. The complete audit trail is captured automatically for compliance.',
    accent: 'text-brand-blue',
    iconBg: 'bg-gradient-to-br from-brand-blue/15 to-brand-blue/5 text-brand-blue',
    dotColor: 'bg-brand-blue',
  },
];

export function HowItWorks() {
  const { ref, isVisible } = useInView({ threshold: 0.1 });

  return (
    <section id="how-it-works" ref={ref} className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className={`max-w-2xl mb-16 scroll-fade-in ${isVisible ? 'is-visible' : ''}`}>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 mb-4">
            Three steps to confident payroll approval
          </h2>
          <p className="text-lg text-slate-500 leading-relaxed">
            No complex setup. No training required. Upload, review, approve.
          </p>
        </div>

        <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">
          {/* Connecting line (desktop only) */}
          <div className="hidden lg:block absolute top-[72px] left-[16.66%] right-[16.66%] h-0.5 bg-gradient-to-r from-brand-blue via-brand-red to-brand-blue opacity-15" />

          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className={`relative scroll-fade-in scroll-delay-${i + 1} ${isVisible ? 'is-visible' : ''}`}
              >
                {/* Step number */}
                <div className={`text-sm font-semibold ${step.accent} tracking-wide mb-5`}>
                  STEP {step.number}
                </div>

                {/* Icon with dot connector */}
                <div className="relative">
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${step.iconBg} mb-6`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  {/* Dot on connecting line (desktop) */}
                  <div className={`hidden lg:block absolute -top-1 left-7 -translate-x-1/2 w-3 h-3 ${step.dotColor} rounded-full ring-4 ring-white`} style={{ top: '-28px' }} />
                </div>

                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-slate-500 leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
