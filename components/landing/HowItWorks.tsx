import React from 'react';
import { Upload, FileSearch, CircleCheckBig } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Upload,
    title: 'Upload your payroll files',
    description:
      'Drop your baseline and current payroll CSV files. All major payroll export formats are supported out of the box.',
    accent: 'text-brand-blue',
    iconBg: 'bg-brand-blue/10 text-brand-blue',
  },
  {
    number: '02',
    icon: FileSearch,
    title: 'Review flagged changes',
    description:
      'Material changes, anomalies, and blockers are automatically surfaced in a single review screen with clear explanations.',
    accent: 'text-brand-red',
    iconBg: 'bg-brand-red/10 text-brand-red',
  },
  {
    number: '03',
    icon: CircleCheckBig,
    title: 'Approve with confidence',
    description:
      'Resolve any issues, add notes, and approve. The complete audit trail is captured automatically for compliance.',
    accent: 'text-brand-blue',
    iconBg: 'bg-brand-blue/10 text-brand-blue',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-2xl mb-16 animate-fade-in-up">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 mb-4">
            Three steps to confident payroll approval
          </h2>
          <p className="text-lg text-slate-500 leading-relaxed">
            No complex setup. No training required. Upload, review, approve.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const delay = i === 0 ? '' : i === 1 ? '-d1' : '-d2';
            return (
              <div key={step.number} className={`animate-fade-in-up${delay}`}>
                <div className={`text-sm font-semibold ${step.accent} tracking-wide mb-5`}>
                  STEP {step.number}
                </div>
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${step.iconBg} mb-6`}>
                  <Icon className="h-7 w-7" />
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
