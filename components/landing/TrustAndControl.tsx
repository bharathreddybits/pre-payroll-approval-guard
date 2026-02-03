import React from 'react';
import { Code2, BarChart3, UserCheck, FileText } from 'lucide-react';
import { useInView } from '../../hooks/useInView';

const pillars = [
  {
    icon: Code2,
    title: 'Deterministic rules',
    description: 'Every judgment is defined in code. No machine learning black boxes. Same input always produces the same output.',
  },
  {
    icon: BarChart3,
    title: 'Confidence scoring',
    description: 'Each rule carries a confidence score based on how often the condition indicates a real error in practice.',
  },
  {
    icon: UserCheck,
    title: 'Human review stays in control',
    description: 'No decisions are automated. Every flag requires a human to review, decide, and document their reasoning.',
  },
  {
    icon: FileText,
    title: 'Full audit trail',
    description: 'Every review, approval, rejection, and note is captured with timestamps and user attribution.',
  },
];

export function TrustAndControl() {
  const { ref, isVisible } = useInView({ threshold: 0.1 });

  return (
    <section ref={ref} className="py-20 lg:py-28 bg-slate-50/70">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className={`max-w-3xl mx-auto text-center mb-16 scroll-fade-in ${isVisible ? 'is-visible' : ''}`}>
          <p className="text-sm font-semibold text-brand-blue uppercase tracking-widest mb-4">
            Trust & Control
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 mb-6">
            PayrollShield doesn&apos;t replace payroll judgment
          </h2>
          <p className="text-xl text-slate-500">
            It makes it consistent.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {pillars.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className={`bg-white rounded-2xl p-8 border border-slate-200/60 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 scroll-fade-in scroll-delay-${Math.min(i + 1, 4)} ${isVisible ? 'is-visible' : ''}`}
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-brand-blue/15 to-brand-blue/5 text-brand-blue mb-5">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{pillar.title}</h3>
                <p className="text-slate-500 leading-relaxed text-sm">{pillar.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
