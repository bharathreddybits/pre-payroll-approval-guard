import React from 'react';

const stats = [
  { value: '99.9%', label: 'Change detection accuracy', color: 'text-brand-blue' },
  { value: '< 5 min', label: 'Average review time', color: 'text-brand-red' },
  { value: '100%', label: 'Audit trail coverage', color: 'text-brand-blue' },
];

export function TrustSignal() {
  return (
    <section id="trust" className="py-16 lg:py-20 border-y border-slate-100 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <p className="text-center text-sm font-medium text-slate-400 uppercase tracking-widest mb-12 animate-fade-in-up">
          Trusted by payroll teams who can&apos;t afford to miss a thing
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`text-center animate-fade-in-up${i === 1 ? '-d1' : i === 2 ? '-d2' : ''}`}
            >
              <div className={`text-3xl lg:text-4xl font-bold ${stat.color} mb-1`}>
                {stat.value}
              </div>
              <div className="text-sm text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
