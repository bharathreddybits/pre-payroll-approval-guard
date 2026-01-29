import React from 'react';

const steps = [
  {
    number: '1',
    title: 'Upload Your Payroll Files',
    description: 'Upload your baseline (last approved) and current payroll CSV files. We support all major payroll export formats.',
    icon: '📤',
  },
  {
    number: '2',
    title: 'Review Flagged Changes',
    description: 'Our system automatically detects and flags material changes, blockers, and anomalies. Everything in one screen.',
    icon: '🔍',
  },
  {
    number: '3',
    title: 'Approve with Confidence',
    description: 'Review AI explanations, resolve blockers, and approve. Complete audit trail captures every decision.',
    icon: '✅',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Review Payroll Changes in 3 Simple Steps
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            No complex setup. No training required. Upload, review, approve.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gray-200" />
              )}

              <div className="text-center">
                <div className="relative inline-flex">
                  <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                    <span className="text-4xl">{step.icon}</span>
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {step.number}
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
