import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function LandingHero() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-44 lg:pb-28 overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50/80 to-white pointer-events-none" />

      {/* Dual-color ambient glows */}
      <div className="absolute top-1/3 left-1/3 w-[600px] h-[400px] bg-brand-blue/[0.04] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-[500px] h-[350px] bg-brand-red/[0.03] rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900 text-balance mb-6">
            Never approve a payroll{' '}
            <span className="text-brand-red">run blind</span> again
          </h1>

          {/* Subtext */}
          <p className="text-lg lg:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            PayrollShield compares every payroll cycle, surfaces material
            changes and blockers automatically, and creates a complete audit
            trail. Review in minutes, not hours.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-white bg-brand-blue rounded-lg hover:bg-brand-blue-dark transition-colors shadow-sm w-full sm:w-auto"
            >
              Start Free Trial
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 px-4 py-3.5 text-base font-medium text-slate-600 hover:text-brand-red transition-colors"
            >
              See how it works
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          {/* Trust line */}
          <p className="text-sm text-slate-400 mb-16 lg:mb-20">
            No credit card required &middot; 14-day free trial &middot; Cancel
            anytime
          </p>
        </div>

        {/* Animated Product Preview */}
        <div className="relative max-w-3xl mx-auto animate-float">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200/60 overflow-hidden">
            {/* Browser chrome */}
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-brand-red/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
              </div>
              <div className="text-[11px] text-slate-400 ml-2 font-medium">
                payrollshield.cloud/review
              </div>
            </div>

            {/* Mock review interface */}
            <div className="p-5 sm:p-6">
              {/* Header row */}
              <div className="flex items-center justify-between mb-4 animate-fade-in-up">
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">
                    Acme Corp — January 2026 Payroll
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pay date: Jan 31, 2026
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse-dot" />
                  Pending Review
                </span>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-4">
                <div className="bg-slate-50 rounded-lg p-2.5 text-center animate-fade-in-up-d1">
                  <div className="text-lg sm:text-xl font-bold text-slate-900">156</div>
                  <div className="text-[10px] text-slate-500">Total Changes</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-2.5 text-center border-l-2 border-amber-400 animate-fade-in-up-d2">
                  <div className="text-lg sm:text-xl font-bold text-amber-700">12</div>
                  <div className="text-[10px] text-amber-600">Material</div>
                </div>
                <div className="bg-red-50 rounded-lg p-2.5 text-center border-l-2 border-brand-red animate-fade-in-up-d3">
                  <div className="text-lg sm:text-xl font-bold text-brand-red">2</div>
                  <div className="text-[10px] text-red-600">Blockers</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-2.5 text-center border-l-2 border-brand-blue animate-fade-in-up-d4">
                  <div className="text-lg sm:text-xl font-bold text-brand-blue text-sm sm:text-base">Pending</div>
                  <div className="text-[10px] text-blue-600">Status</div>
                </div>
              </div>

              {/* Blocker alert */}
              <div className="bg-red-50 border border-red-200/60 rounded-lg p-3 animate-fade-in-up-d4">
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-red/10 text-brand-red flex items-center justify-center text-xs font-bold">
                    !
                  </span>
                  <div>
                    <div className="font-medium text-red-800 text-xs">
                      Blocker: Negative Net Pay Detected
                    </div>
                    <div className="text-[11px] text-red-600 mt-0.5">
                      Employee #1042 — Net pay is -$245.00
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Gradient glow behind card */}
          <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-r from-brand-blue/[0.06] to-brand-red/[0.06] rounded-full blur-3xl pointer-events-none" />
        </div>
      </div>
    </section>
  );
}
