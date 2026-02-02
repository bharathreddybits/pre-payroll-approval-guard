import React from 'react';
import { Scan, ShieldAlert, FileCheck, Sparkles } from 'lucide-react';
import { useInView } from '../../hooks/useInView';

const values = [
  {
    icon: Scan,
    title: 'Automatic Detection',
    description:
      'Every change between payroll runs is identified and categorized. No manual spreadsheet comparison needed.',
    accent: 'blue' as const,
  },
  {
    icon: ShieldAlert,
    title: 'Blocker Alerts',
    description:
      'Critical issues like negative net pay or missing deductions are flagged before they can cause damage.',
    accent: 'red' as const,
  },
  {
    icon: FileCheck,
    title: 'Complete Audit Trail',
    description:
      'Every review, approval, and note is captured with timestamps and user attribution. Always audit-ready.',
    accent: 'blue' as const,
  },
  {
    icon: Sparkles,
    title: 'AI-Powered Explanations',
    description:
      'Understand exactly why each change was flagged with clear, contextual explanations generated in plain language.',
    accent: 'red' as const,
  },
];

const accentStyles = {
  blue: {
    iconBg: 'bg-gradient-to-br from-brand-blue/15 to-brand-blue/5 text-brand-blue',
    hoverBorder: 'hover:border-brand-blue/20',
  },
  red: {
    iconBg: 'bg-gradient-to-br from-brand-red/15 to-brand-red/5 text-brand-red',
    hoverBorder: 'hover:border-brand-red/20',
  },
};

export function CoreValues() {
  const { ref, isVisible } = useInView({ threshold: 0.1 });

  return (
    <section id="features" ref={ref} className="py-20 lg:py-28 bg-slate-50/70">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className={`max-w-2xl mb-16 scroll-fade-in ${isVisible ? 'is-visible' : ''}`}>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 mb-4">
            Accuracy at every step
          </h2>
          <p className="text-lg text-slate-500 leading-relaxed">
            From upload to approval, PayrollShield ensures nothing slips
            through the cracks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {values.map((value, i) => {
            const Icon = value.icon;
            const styles = accentStyles[value.accent];
            return (
              <div
                key={value.title}
                className={`bg-white rounded-2xl p-8 lg:p-10 border border-slate-200/60 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02] ${styles.hoverBorder} scroll-fade-in scroll-delay-${i + 1} ${isVisible ? 'is-visible' : ''}`}
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${styles.iconBg} mb-6`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  {value.title}
                </h3>
                <p className="text-slate-500 leading-relaxed">
                  {value.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
