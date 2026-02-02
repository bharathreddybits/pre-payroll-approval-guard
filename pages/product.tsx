import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { MarketingNav, Footer } from '../components/landing';
import { Scan, ShieldAlert, BarChart3, ClipboardCheck, FileText, Users, Building2, Scale } from 'lucide-react';

const capabilities = [
  {
    icon: Scan,
    title: 'Payroll Change Detection',
    description: 'Automatically compare consecutive payroll runs line by line. Every change in net pay, gross pay, deductions, and individual components is identified and categorized — no spreadsheets, no manual effort.',
    accent: 'from-brand-blue to-blue-400',
  },
  {
    icon: ShieldAlert,
    title: 'Risk Classification',
    description: 'Each change is evaluated against a library of deterministic rules. Blockers like negative net pay are flagged immediately. Material changes are separated from routine noise so you focus where it matters.',
    accent: 'from-brand-red to-red-400',
  },
  {
    icon: BarChart3,
    title: 'Materiality Assessment',
    description: 'Not every change is worth your time. PayrollShield scores changes by confidence and severity, so you can quickly distinguish a $5 rounding adjustment from a $5,000 payroll error.',
    accent: 'from-brand-blue to-indigo-400',
  },
  {
    icon: ClipboardCheck,
    title: 'Review & Approval Workflow',
    description: 'A single review screen shows blockers, material changes, and AI explanations. Approve, reject, or add notes — all in one place. Blocker resolution is enforced before approval is allowed.',
    accent: 'from-brand-red to-orange-400',
  },
  {
    icon: FileText,
    title: 'Complete Audit Trail',
    description: 'Every review, decision, and note is captured with timestamps and user attribution. When auditors come calling, the evidence is already organized and ready.',
    accent: 'from-brand-blue to-blue-400',
  },
];

const audiences = [
  {
    icon: Users,
    title: 'Payroll Teams',
    description: 'Replace manual spreadsheet comparisons with automated change detection. Catch errors before they reach employees.',
  },
  {
    icon: Building2,
    title: 'Finance & Accounting',
    description: 'Gain visibility into payroll variance. Understand cost impacts before approving runs that affect the P&L.',
  },
  {
    icon: Scale,
    title: 'Compliance & Audit',
    description: 'Maintain a defensible audit trail for every payroll decision. Meet SOX, internal audit, and regulatory requirements.',
  },
];

export default function ProductPage() {
  return (
    <>
      <Head>
        <title>Product — PayrollShield</title>
        <meta name="description" content="Explore PayrollShield's core capabilities: payroll change detection, risk classification, materiality assessment, review workflows, and complete audit trails." />
      </Head>

      <MarketingNav />

      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-16 lg:pt-44 lg:pb-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-white pointer-events-none" />
          <div className="absolute top-1/3 right-1/4 w-[500px] h-[400px] bg-brand-blue/[0.04] rounded-full blur-3xl pointer-events-none" />
          <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-brand-blue uppercase tracking-widest mb-4">Product</p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 mb-6">
                Every payroll change,{' '}
                <span className="bg-gradient-to-r from-brand-blue to-brand-red bg-clip-text text-transparent">
                  accounted for
                </span>
              </h1>
              <p className="text-lg lg:text-xl text-slate-500 leading-relaxed mb-8">
                PayrollShield sits between your payroll export and your approval. It detects what changed, classifies the risk, explains it in plain language, and gives you one screen to approve with confidence.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-white bg-gradient-to-r from-brand-blue to-brand-blue-dark rounded-lg hover:shadow-lg hover:shadow-brand-blue/20 transition-all duration-300"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </section>

        {/* Capabilities */}
        <section className="py-20 lg:py-28 bg-white">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="max-w-2xl mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-4">
                Core Capabilities
              </h2>
              <p className="text-lg text-slate-500">
                Five layers of protection between your payroll data and an unapproved run.
              </p>
            </div>

            <div className="space-y-6">
              {capabilities.map((cap, i) => {
                const Icon = cap.icon;
                return (
                  <div
                    key={cap.title}
                    className="group bg-white border border-slate-200 rounded-2xl p-8 lg:p-10 hover:shadow-lg hover:border-slate-300 transition-all duration-300"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                      <div className={`flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br ${cap.accent} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300`}>
                        <Icon className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <div className="flex items-baseline gap-3 mb-2">
                          <span className="text-xs font-mono text-slate-400">{String(i + 1).padStart(2, '0')}</span>
                          <h3 className="text-xl font-semibold text-slate-900">{cap.title}</h3>
                        </div>
                        <p className="text-slate-500 leading-relaxed max-w-2xl">{cap.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Who it's for */}
        <section className="py-20 lg:py-28 bg-slate-50">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="max-w-2xl mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-4">
                Built for the people who own payroll accuracy
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {audiences.map((a) => {
                const Icon = a.icon;
                return (
                  <div key={a.title} className="bg-white rounded-2xl p-8 border border-slate-200 hover:shadow-md transition-shadow duration-300">
                    <div className="w-12 h-12 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center mb-5">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{a.title}</h3>
                    <p className="text-slate-500 leading-relaxed text-sm">{a.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 lg:py-24">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              See it in action
            </h2>
            <p className="text-lg text-slate-500 mb-8 max-w-xl mx-auto">
              Upload your first payroll file and see how PayrollShield surfaces changes you would have missed.
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
