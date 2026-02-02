import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { MarketingNav, Footer } from '../components/landing';
import { Building2, Users, GitMerge, Globe, ShieldAlert } from 'lucide-react';

const useCases = [
  {
    icon: Building2,
    title: 'Mid-Size Companies Without a Dedicated Payroll Audit Team',
    problem: 'Your payroll team runs payroll every two weeks but relies on manual spreadsheet comparisons to catch changes. A missed entry or formula error can mean overpaying or underpaying employees — and you only discover it after the run is processed.',
    solution: 'PayrollShield automatically compares your baseline and current payroll files, flagging every change with materiality scores. Your team reviews a single screen instead of scanning hundreds of rows.',
    outcome: 'Errors caught before they become costly corrections. Review time drops from hours to minutes. No more "we didn\'t notice" conversations with employees.',
    accent: 'from-brand-blue to-blue-400',
  },
  {
    icon: Users,
    title: 'Payroll Service Providers Managing Multiple Clients',
    problem: 'You process payroll for dozens of clients with different pay schedules, deduction structures, and compliance requirements. A single mistake on one client\'s payroll can damage trust across your entire portfolio.',
    solution: 'Each client gets their own organization in PayrollShield. Upload files per client, and the system handles change detection, risk classification, and audit trails independently for each. Material changes and blockers are surfaced per organization.',
    outcome: 'Consistent quality across all clients. A defensible audit trail for every decision. Reduced liability exposure for your firm.',
    accent: 'from-brand-red to-red-400',
  },
  {
    icon: GitMerge,
    title: 'Companies Migrating Payroll Systems',
    problem: 'You\'re switching payroll providers and need to validate that the new system produces identical results to the old one. Parallel runs generate massive files, and manual comparison is impractical.',
    solution: 'Upload exports from both systems as baseline and current files. PayrollShield diffs them instantly, highlighting every discrepancy — whether it\'s a rounding difference, a missing deduction, or a misclassified component.',
    outcome: 'Confidence that the migration is clean before you cut over. A documented comparison record for stakeholders.',
    accent: 'from-brand-blue to-indigo-400',
  },
  {
    icon: Globe,
    title: 'Multi-State or Multi-Entity Organizations',
    problem: 'Operating across states or entities means different tax rules, benefit structures, and compliance requirements. Changes in one entity can cascade to others, and tracking variance manually across entities is unreliable.',
    solution: 'PayrollShield treats each entity as a separate review session. Upload and compare independently, with centralized visibility into blockers and material changes across all entities from a single dashboard.',
    outcome: 'Entity-level visibility without entity-level effort. Compliance gaps are caught before they compound across jurisdictions.',
    accent: 'from-brand-red to-orange-400',
  },
  {
    icon: ShieldAlert,
    title: 'Organizations Preparing for Audit',
    problem: 'Internal or external auditors request evidence that payroll changes were reviewed and approved. Gathering this retroactively from email threads and spreadsheets is time-consuming and incomplete.',
    solution: 'Every review in PayrollShield captures who reviewed, what was flagged, what action was taken, and any notes. The audit log is exportable and timestamped automatically.',
    outcome: 'Audit readiness built into your workflow, not bolted on after the fact. Auditor requests answered in minutes.',
    accent: 'from-brand-blue to-blue-400',
  },
];

export default function UseCasesPage() {
  return (
    <>
      <Head>
        <title>Use Cases — PayrollShield</title>
        <meta name="description" content="See how payroll teams, service providers, and compliance officers use PayrollShield to catch errors, reduce risk, and maintain audit-ready records." />
      </Head>

      <MarketingNav />

      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-16 lg:pt-44 lg:pb-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-red-50/20 to-white pointer-events-none" />
          <div className="absolute top-1/2 right-1/3 w-[500px] h-[400px] bg-brand-red/[0.03] rounded-full blur-3xl pointer-events-none" />
          <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-brand-red uppercase tracking-widest mb-4">Use Cases</p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 mb-6">
                How PayrollShield helps{' '}
                <span className="bg-gradient-to-r from-brand-red to-brand-blue bg-clip-text text-transparent">
                  different teams
                </span>
              </h1>
              <p className="text-lg lg:text-xl text-slate-500 leading-relaxed">
                Whether you process payroll for 50 employees or 5,000 across multiple entities, PayrollShield adapts to your workflow.
              </p>
            </div>
          </div>
        </section>

        {/* Use cases */}
        <section className="py-20 lg:py-28 bg-white">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 space-y-12">
            {useCases.map((uc, i) => {
              const Icon = uc.icon;
              return (
                <div key={uc.title} className="group border border-slate-200 rounded-2xl p-8 lg:p-10 hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-start gap-5 mb-6">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${uc.accent} flex items-center justify-center group-hover:scale-105 transition-transform duration-300`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 pt-2">{uc.title}</h3>
                  </div>

                  <div className="space-y-4 ml-0 lg:ml-[68px]">
                    <div>
                      <span className="text-xs font-semibold text-brand-red uppercase tracking-wide">The Problem</span>
                      <p className="text-slate-600 leading-relaxed mt-1">{uc.problem}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-brand-blue uppercase tracking-wide">How PayrollShield Helps</span>
                      <p className="text-slate-600 leading-relaxed mt-1">{uc.solution}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                      <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Outcome</span>
                      <p className="text-slate-700 leading-relaxed mt-1 font-medium text-sm">{uc.outcome}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 lg:py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              See your use case in action
            </h2>
            <p className="text-lg text-slate-500 mb-8 max-w-xl mx-auto">
              Upload a sample payroll file and experience the review workflow firsthand.
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
