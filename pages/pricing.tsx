import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { MarketingNav, Footer } from '../components/landing';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    description: 'For small teams getting started with payroll review.',
    monthlyPrice: 0,
    annualPrice: 0,
    priceLabel: 'Free',
    cta: 'Start Free',
    ctaHref: '/signup',
    highlight: false,
    features: [
      'Up to 50 employees per payroll',
      '3 review sessions per month',
      'Change detection & blocker alerts',
      'Basic audit trail',
      'Email support',
    ],
  },
  {
    name: 'Pro',
    description: 'For payroll teams that need full coverage and AI explanations.',
    monthlyPrice: 99,
    annualPrice: 79,
    priceLabel: null,
    cta: 'Start Free Trial',
    ctaHref: '/signup',
    highlight: true,
    features: [
      'Unlimited employees',
      'Unlimited review sessions',
      'AI-powered explanations',
      'Full audit trail with export',
      'Multi-organization support',
      'Priority support',
      'Custom materiality rules',
    ],
  },
  {
    name: 'Enterprise',
    description: 'For organizations with advanced compliance and integration needs.',
    monthlyPrice: null,
    annualPrice: null,
    priceLabel: 'Custom',
    cta: 'Contact Sales',
    ctaHref: 'mailto:sales@payrollshield.cloud',
    highlight: false,
    features: [
      'Everything in Pro',
      'SSO / SAML integration',
      'Dedicated account manager',
      'Custom integrations & API access',
      'SLA guarantees',
      'On-premises deployment option',
      'Security review & compliance docs',
    ],
  },
];

const faqs = [
  {
    q: 'What counts as a review session?',
    a: 'A review session is created each time you upload a baseline and current payroll file for comparison. Each comparison counts as one session, regardless of how many employees are in the file.',
  },
  {
    q: 'Can I switch plans later?',
    a: 'Yes. You can upgrade or downgrade at any time. When upgrading, you get immediate access to the new features. When downgrading, the change takes effect at the start of your next billing cycle.',
  },
  {
    q: 'Is there a free trial for Pro?',
    a: 'Yes. The Pro plan includes a 14-day free trial with full access to all features. No credit card required to start.',
  },
  {
    q: 'What happens if I exceed the Starter plan limits?',
    a: 'We will notify you when you are approaching the limit. You will not lose access to existing reviews, but new sessions will require upgrading to Pro.',
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
        <meta name="description" content="Simple, transparent pricing for PayrollShield. Free starter plan, Pro for growing teams, and Enterprise for organizations with advanced needs." />
      </Head>

      <MarketingNav />

      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-12 lg:pt-44 lg:pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/20 pointer-events-none" />
          <div className="relative max-w-7xl mx-auto px-6 lg:px-8 text-center">
            <p className="text-sm font-semibold text-brand-blue uppercase tracking-widest mb-4">Pricing</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 mb-6">
              Simple, transparent pricing
            </h1>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-8">
              One avoided payroll mistake pays for years of PayrollShield. Start free, upgrade when you need to.
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {plans.map((plan) => {
                const price = plan.priceLabel || (annual ? `$${plan.annualPrice}` : `$${plan.monthlyPrice}`);
                const isMailto = plan.ctaHref.startsWith('mailto:');
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

                    {isMailto ? (
                      <a
                        href={plan.ctaHref}
                        className={`block w-full text-center px-6 py-3 rounded-lg font-semibold transition-colors ${
                          plan.highlight
                            ? 'bg-white text-brand-blue hover:bg-blue-50'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                      >
                        {plan.cta}
                      </a>
                    ) : (
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
                    )}
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
