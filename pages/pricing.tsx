import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { MarketingNav, Footer } from '../components/landing';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    description: 'Essential payroll review for growing teams.',
    monthlyPrice: 249,
    annualPrice: 199,
    priceLabel: null,
    cta: 'Start 7-Day Free Trial',
    ctaHref: '/signup',
    highlight: false,
    features: [
      'Up to 100 employees per payroll',
      'Unlimited review sessions',
      '15 core detection rules',
      'Template CSV format',
      'Change detection & blocker alerts',
      'AI-powered explanations',
      'Full audit trail',
      'Email support',
    ],
  },
  {
    name: 'Pro',
    description: 'Full coverage with AI mapping and 60+ rules for payroll teams.',
    monthlyPrice: 749,
    annualPrice: 599,
    priceLabel: null,
    cta: 'Start 7-Day Free Trial',
    ctaHref: '/signup',
    highlight: true,
    features: [
      'Everything in Starter',
      'Unlimited employees',
      '60+ advanced detection rules',
      'Flexible CSV import (any format)',
      'AI-powered column mapping',
      'Multi-organization support',
      'Priority support',
    ],
  },
];

const faqs = [
  {
    q: 'What counts as a review session?',
    a: 'A review session is created each time you upload a baseline and current payroll file for comparison. Each comparison counts as one session, regardless of how many employees are in the file.',
  },
  {
    q: 'Do both plans include a free trial?',
    a: 'Yes. Both Starter and Pro include a 7-day free trial with full access to all features. No credit card required to start.',
  },
  {
    q: 'Can I switch plans later?',
    a: 'Yes. You can upgrade or downgrade at any time. When upgrading, you get immediate access to the new features. When downgrading, the change takes effect at the start of your next billing cycle.',
  },
  {
    q: 'What is the difference between Starter and Pro?',
    a: 'Starter supports up to 100 employees with 15 core detection rules and template CSV format. Pro adds unlimited employees, 60+ advanced rules, flexible CSV import with AI-powered column mapping, and multi-organization support.',
  },
  {
    q: 'How does annual billing work?',
    a: 'Annual plans are billed once per year at a 20% discount compared to monthly billing. You can cancel at any time but refunds are not issued for the remaining term.',
  },
  {
    q: 'One payroll mistake could cost thousands. How does pricing compare?',
    a: 'A single undetected payroll error — an overpayment, a missed deduction, a compliance fine — can easily cost $5,000 to $50,000+. PayrollShield pays for itself the first time it catches a material error before it reaches employees.',
  },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <>
      <Head>
        <title>Pricing — PayrollShield</title>
        <meta name="description" content="Simple, transparent pricing for PayrollShield. Starter at $249/mo and Pro at $749/mo — both with a 7-day free trial." />
      </Head>

      <MarketingNav />

      <main>
        {/* Hero */}
        <section className="relative pt-48 pb-12 lg:pt-56 lg:pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/20 pointer-events-none" />
          <div className="relative max-w-7xl mx-auto px-6 lg:px-8 text-center">
            <p className="text-sm font-semibold text-brand-blue uppercase tracking-widest mb-4">Pricing</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 mb-6">
              Simple, transparent pricing
            </h1>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-8">
              One avoided payroll mistake pays for years of PayrollShield. Try any plan free for 7 days.
            </p>

            {/* Toggle */}
            <div className="flex items-center justify-center gap-3 mb-12">
              <span className={`text-sm font-medium ${!annual ? 'text-slate-900' : 'text-slate-400'}`}>Monthly</span>
              <button
                onClick={() => setAnnual(!annual)}
                className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-brand-blue' : 'bg-slate-300'}`}
                aria-label="Toggle annual billing"
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${annual ? 'translate-x-6' : ''}`} />
              </button>
              <span className={`text-sm font-medium ${annual ? 'text-slate-900' : 'text-slate-400'}`}>
                Annual <span className="text-green-600 font-semibold">Save 20%</span>
              </span>
            </div>
          </div>
        </section>

        {/* Plans */}
        <section className="pb-20 lg:pb-28">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {plans.map((plan) => {
                const price = plan.priceLabel || (annual ? `$${plan.annualPrice}` : `$${plan.monthlyPrice}`);
                return (
                  <div
                    key={plan.name}
                    className={`rounded-2xl p-8 flex flex-col ${
                      plan.highlight
                        ? 'bg-gradient-to-b from-brand-blue to-brand-blue-dark text-white shadow-xl shadow-brand-blue/20 ring-2 ring-brand-blue/30 relative'
                        : 'bg-white border border-slate-200'
                    }`}
                  >
                    {plan.highlight && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-red text-white text-xs font-bold px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    )}
                    <h3 className={`text-xl font-bold ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>
                      {plan.name}
                    </h3>
                    <p className={`text-sm mt-1 mb-6 ${plan.highlight ? 'text-blue-200' : 'text-slate-500'}`}>
                      {plan.description}
                    </p>

                    <div className="mb-6">
                      <span className={`text-4xl font-extrabold ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>
                        {price}
                      </span>
                      {plan.monthlyPrice !== null && plan.monthlyPrice > 0 && (
                        <span className={`text-sm ml-1 ${plan.highlight ? 'text-blue-200' : 'text-slate-500'}`}>/mo</span>
                      )}
                    </div>

                    <ul className="space-y-3 mb-8 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5">
                          <Check className={`h-4 w-4 mt-0.5 flex-shrink-0 ${plan.highlight ? 'text-blue-300' : 'text-green-500'}`} />
                          <span className={`text-sm ${plan.highlight ? 'text-blue-100' : 'text-slate-600'}`}>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href={plan.ctaHref}
                      className={`block w-full text-center px-6 py-3 rounded-lg font-semibold transition-colors ${
                        plan.highlight
                          ? 'bg-white text-brand-blue hover:bg-blue-50'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      {plan.cta}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 lg:py-28 bg-slate-50">
          <div className="max-w-3xl mx-auto px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">Frequently asked questions</h2>
            <div className="space-y-6">
              {faqs.map((faq) => (
                <div key={faq.q} className="bg-white rounded-xl p-6 border border-slate-200">
                  <h3 className="font-semibold text-slate-900 mb-2">{faq.q}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
