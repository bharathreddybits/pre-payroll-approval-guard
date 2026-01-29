import React from 'react';

const features = [
  {
    icon: '🔄',
    title: 'Automatic Change Detection',
    description: 'Upload two payroll files and instantly see every difference, no matter how small.',
  },
  {
    icon: '⚠️',
    title: 'Material Change Flagging',
    description: 'Smart rules identify changes that matter: large variances, new employees, rate changes.',
  },
  {
    icon: '🚫',
    title: 'Blocker Alerts',
    description: 'Critical issues like negative net pay are blocked until resolved. No more costly mistakes.',
  },
  {
    icon: '👆',
    title: 'One-Click Approval',
    description: 'Review everything in one screen. Approve or reject with a single click and notes.',
  },
  {
    icon: '📊',
    title: 'Complete Audit Trail',
    description: 'Every action is logged. Know who approved what, when, and why. Auditor-ready.',
  },
  {
    icon: '🤖',
    title: 'AI-Powered Explanations',
    description: 'Understand why changes were flagged with clear, plain-language explanations.',
  },
];

export function FeaturesGrid() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Everything You Need to Review Payroll with Confidence
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Built by payroll professionals for payroll professionals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-6 border border-gray-200 hover:border-primary/50 hover:shadow-lg transition-all"
            >
              <div className="text-3xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
