import React from 'react';
import Link from 'next/link';
import { Button } from '../ui/button';

const features = [
  'Unlimited payroll comparisons',
  'Material change detection',
  'Blocker alerts',
  'Complete audit trail',
  'AI-powered explanations',
  'Email support',
];

export function PricingSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-gray-600 text-lg">
            Start free. No credit card required.
          </p>
        </div>

        <div className="bg-white rounded-2xl border-2 border-primary shadow-xl overflow-hidden max-w-md mx-auto">
          {/* Header */}
          <div className="bg-primary text-white p-6 text-center">
            <div className="text-sm font-medium uppercase tracking-wide mb-1">Free Trial</div>
            <div className="text-4xl font-bold">14 Days</div>
            <div className="text-primary-foreground/80 text-sm mt-1">Full access, no limits</div>
          </div>

          {/* Body */}
          <div className="p-6">
            <ul className="space-y-3 mb-8">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <svg
                    className="w-5 h-5 text-green-500 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <Link href="/signup" className="block">
              <Button size="lg" className="w-full text-lg py-6">
                Start Free Trial
              </Button>
            </Link>

            <p className="text-center text-sm text-gray-500 mt-4">
              No credit card required
            </p>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t">
            <p className="text-center text-sm text-gray-600">
              After trial: Plans starting at <span className="font-semibold">$49/month</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
