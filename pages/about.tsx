import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { MarketingNav, Footer } from '../components/landing';
import { Target, ShieldCheck, Eye, Scale } from 'lucide-react';

const principles = [
  {
    icon: Target,
    title: 'Accuracy First',
    description: 'Every feature we build is measured by one question: does this reduce the chance of a payroll error reaching employees? If not, it does not ship.',
  },
  {
    icon: ShieldCheck,
    title: 'Trust Through Transparency',
    description: 'We show our work. Every change detection rule, confidence score, and AI explanation is visible and auditable. No black boxes.',
  },
  {
    icon: Eye,
    title: 'Auditability by Default',
    description: 'Audit trails are not an afterthought. Every action in PayrollShield is timestamped, attributed, and exportable from day one.',
  },
  {
    icon: Scale,
    title: 'Safe Over Clever',
    description: 'When forced to choose between a clever optimization and a safe, predictable outcome, we choose safe. Payroll demands reliability, not novelty.',
  },
];

export default function AboutPage() {
  return (
    <>
      <Head>
        <title>About — PayrollShield</title>
        <meta name="description" content="PayrollShield exists because payroll risk is expensive and invisible. Learn what we do, why we built it, and the principles that guide us." />
      </Head>

      <MarketingNav />

      <main>
        {/* Hero */}
        <section className="relative pt-48 pb-16 lg:pt-56 lg:pb-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/20 to-white pointer-events-none" />
          <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-brand-blue uppercase tracking-widest mb-4">About</p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 mb-6">
                Payroll risk is{' '}
                <span className="bg-gradient-to-r from-brand-red to-brand-blue bg-clip-text text-transparent">
                  expensive and invisible
                </span>
              </h1>
              <p className="text-lg lg:text-xl text-slate-500 leading-relaxed">
                Until it isn&apos;t. That&apos;s why we built PayrollShield.
              </p>
            </div>
          </div>
        </section>

        {/* What we do */}
        <section className="py-20 lg:py-28 bg-white">
          <div className="max-w-3xl mx-auto px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-6">What PayrollShield does</h2>
            <div className="space-y-4 text-slate-600 leading-relaxed">
              <p>
                PayrollShield is a pre-payroll approval guard. It sits between your payroll export and your &ldquo;approve&rdquo; button.
              </p>
              <p>
                When you upload your payroll files, PayrollShield compares every line — net pay, gross pay, deductions, individual components — and identifies what changed. Changes are classified by materiality and risk. Blockers (like negative net pay) are flagged immediately. AI-generated explanations tell you why each change was flagged, in plain language.
              </p>
              <p>
                You review everything on a single screen, make a decision (approve or reject with notes), and the complete audit trail is captured automatically.
              </p>
            </div>
          </div>
        </section>

        {/* Why it exists */}
        <section className="py-20 lg:py-28 bg-slate-50">
          <div className="max-w-3xl mx-auto px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-6">Why PayrollShield exists</h2>
            <div className="space-y-4 text-slate-600 leading-relaxed">
              <p>
                Most payroll errors don&apos;t happen because people aren&apos;t careful. They happen because the volume of data makes it humanly impossible to catch every change in a spreadsheet comparison.
              </p>
              <p>
                A single undetected overpayment, a missed deduction, or a compliance violation can cost thousands — sometimes tens of thousands — in corrections, penalties, and lost employee trust.
              </p>
              <p>
                And unlike other business risks, payroll errors are often invisible until after the money has moved. There is no undo button on a bank transfer.
              </p>
              <p>
                PayrollShield exists to make every payroll change visible before approval. Not after.
              </p>
            </div>
          </div>
        </section>

        {/* Who it's for */}
        <section className="py-20 lg:py-28 bg-white">
          <div className="max-w-3xl mx-auto px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-6">Who it&apos;s built for</h2>
            <div className="space-y-4 text-slate-600 leading-relaxed">
              <p>
                PayrollShield is built for anyone responsible for payroll accuracy: payroll managers, payroll service providers, finance teams who approve payroll runs, and compliance officers who need audit-ready documentation.
              </p>
              <p>
                Whether you process payroll for 50 employees or 5,000, whether you run one entity or dozens, PayrollShield adapts to your workflow — not the other way around.
              </p>
            </div>
          </div>
        </section>

        {/* Principles */}
        <section className="py-20 lg:py-28 bg-slate-50">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">Our principles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {principles.map((p) => {
                const Icon = p.icon;
                return (
                  <div key={p.title} className="bg-white rounded-2xl p-8 border border-slate-200">
                    <div className="w-12 h-12 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center mb-5">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{p.title}</h3>
                    <p className="text-slate-500 leading-relaxed text-sm">{p.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 lg:py-24">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Ready to see for yourself?</h2>
            <p className="text-lg text-slate-500 mb-8 max-w-xl mx-auto">
              Start your free trial and upload your first payroll file in minutes.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-white bg-gradient-to-r from-brand-blue to-brand-blue-dark rounded-lg hover:shadow-lg hover:shadow-brand-blue/20 transition-all duration-300"
            >
              Start Free Trial
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
