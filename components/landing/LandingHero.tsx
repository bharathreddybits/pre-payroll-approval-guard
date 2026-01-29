import React from 'react';
import Link from 'next/link';
import { Button } from '../ui/button';

export function LandingHero() {
  return (
    <section className="relative bg-gradient-to-b from-gray-50 to-white py-20 lg:py-32">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Trusted by payroll teams
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Stop{' '}
            <span className="text-red-600">$50K Payroll Mistakes</span>
            {' '}Before They Happen
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Automatically detect and flag material payroll changes.
            Review everything in under 5 minutes with complete audit trail.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link href="/signup">
              <Button size="lg" className="text-lg px-8 py-6 w-full sm:w-auto">
                Start Free Trial
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6 w-full sm:w-auto">
                See How It Works
              </Button>
            </a>
          </div>

          {/* Trust Indicators */}
          <p className="text-sm text-gray-500">
            No credit card required &bull; 14-day free trial &bull; Cancel anytime
          </p>
        </div>

        {/* Hero Image/Preview */}
        <div className="mt-16 relative">
          <div className="bg-white rounded-xl shadow-2xl border overflow-hidden max-w-4xl mx-auto">
            <div className="bg-gray-100 px-4 py-2 border-b flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div className="text-xs text-gray-500 ml-2">PayrollShield</div>
            </div>
            <div className="p-6">
              {/* Mock Review Interface */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">Acme Corp - January 2024 Payroll</h3>
                    <p className="text-sm text-gray-500">Pay Date: Jan 31, 2024</p>
                  </div>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                    Pending Review
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-gray-900">156</div>
                    <div className="text-xs text-gray-500">Total Changes</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3 text-center border-l-4 border-yellow-500">
                    <div className="text-2xl font-bold text-yellow-700">12</div>
                    <div className="text-xs text-yellow-600">Material</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center border-l-4 border-red-500">
                    <div className="text-2xl font-bold text-red-700">2</div>
                    <div className="text-xs text-red-600">Blockers</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 text-center border-l-4 border-blue-500">
                    <div className="text-2xl font-bold text-blue-700">Pending</div>
                    <div className="text-xs text-blue-600">Status</div>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-red-500 text-xl">!</span>
                    <div>
                      <div className="font-medium text-red-800">Blocker: Negative Net Pay Detected</div>
                      <div className="text-sm text-red-600">Employee #1042 - Net pay is -$245.00</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Decorative gradient blur */}
          <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-3xl"></div>
        </div>
      </div>
    </section>
  );
}
