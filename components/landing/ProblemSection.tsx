import React from 'react';

const problems = [
  {
    icon: '💸',
    title: 'Overpayments Go Unnoticed',
    description: 'A single wrong digit can mean thousands in overpayments that are nearly impossible to recover.',
    stat: '$50K+',
    statLabel: 'average cost of payroll errors annually',
  },
  {
    icon: '⏰',
    title: 'Manual Review Takes Hours',
    description: 'Comparing spreadsheets line by line is tedious, error-prone, and steals time from strategic work.',
    stat: '4-6 hrs',
    statLabel: 'spent on manual payroll review',
  },
  {
    icon: '📋',
    title: 'No Audit Trail',
    description: 'When auditors ask who approved what and why, you need answers. Spreadsheets don\'t cut it.',
    stat: '100%',
    statLabel: 'of audits require approval documentation',
  },
];

export function ProblemSection() {
  return (
    <section className="py-20 bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            One Wrong Digit Can Cost Your Company{' '}
            <span className="text-red-400">Thousands</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Payroll errors are expensive, time-consuming, and a compliance nightmare.
            Don't let them slip through the cracks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {problems.map((problem, index) => (
            <div
              key={index}
              className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors"
            >
              <div className="text-4xl mb-4">{problem.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{problem.title}</h3>
              <p className="text-gray-400 mb-6">{problem.description}</p>
              <div className="pt-4 border-t border-gray-700">
                <div className="text-3xl font-bold text-red-400">{problem.stat}</div>
                <div className="text-sm text-gray-500">{problem.statLabel}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
