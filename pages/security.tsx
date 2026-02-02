import React from 'react';
import Head from 'next/head';
import { MarketingNav, Footer } from '../components/landing';
import { Lock, ShieldCheck, KeyRound, Server, FileCheck, Eye } from 'lucide-react';

const securityFeatures = [
  {
    icon: Lock,
    title: 'Encryption at Rest & in Transit',
    description: 'All payroll data is encrypted using AES-256 at rest and TLS 1.3 in transit. Your data is protected whether it is being stored, processed, or transferred between services.',
  },
  {
    icon: KeyRound,
    title: 'Access Controls',
    description: 'Role-based access ensures only authorized users can view or act on payroll data. Row-level security (RLS) is enforced at the database level — not just the application layer.',
  },
  {
    icon: FileCheck,
    title: 'Audit Logging',
    description: 'Every login, data access, review decision, and approval is logged with timestamps and user attribution. Audit logs are immutable and available for export.',
  },
  {
    icon: Server,
    title: 'Infrastructure Security',
    description: 'PayrollShield runs on isolated cloud infrastructure with automated patching, DDoS protection, and network-level firewalls. No shared hosting. No shared databases.',
  },
  {
    icon: Eye,
    title: 'Data Minimization',
    description: 'We only process the payroll fields needed for change detection. Sensitive PII is never stored beyond what is required for the comparison, and all data is scoped to your organization.',
  },
  {
    icon: ShieldCheck,
    title: 'Compliance Posture',
    description: 'PayrollShield is built with SOC 2 Type II controls in mind. We follow industry-standard practices for data handling, access management, incident response, and vendor security.',
  },
];

export default function SecurityPage() {
  return (
    <>
      <Head>
        <title>Security — PayrollShield</title>
        <meta name="description" content="Learn how PayrollShield protects your payroll data with encryption, access controls, audit logging, infrastructure isolation, and compliance-ready practices." />
      </Head>

      <MarketingNav />

      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-16 lg:pt-44 lg:pb-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pointer-events-none" />
          <div className="absolute top-1/3 left-1/3 w-[500px] h-[400px] bg-brand-blue/[0.08] rounded-full blur-3xl pointer-events-none" />
          <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-blue-400 uppercase tracking-widest mb-4">Security</p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6">
                Payroll data demands{' '}
                <span className="bg-gradient-to-r from-blue-400 to-brand-blue-light bg-clip-text text-transparent">
                  serious security
                </span>
              </h1>
              <p className="text-lg lg:text-xl text-slate-300 leading-relaxed">
                PayrollShield is built from the ground up to protect sensitive compensation data. Encryption, isolation, access controls, and audit trails are not add-ons — they are foundational.
              </p>
            </div>
          </div>
        </section>

        {/* Security features */}
        <section className="py-20 lg:py-28 bg-white">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {securityFeatures.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="group border border-slate-200 rounded-2xl p-8 hover:shadow-lg hover:border-slate-300 transition-all duration-300"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                    <p className="text-slate-500 leading-relaxed text-sm">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Compliance section */}
        <section className="py-20 lg:py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
                Compliance-ready by design
              </h2>
              <p className="text-lg text-slate-500 leading-relaxed mb-8">
                PayrollShield maintains controls aligned with SOC 2 Type II, including logical access management, change management, system monitoring, and incident response procedures. Our architecture supports audit requirements for organizations subject to SOX, GDPR, and industry-specific regulations.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto">
                {['SOC 2 Ready', 'GDPR Aware', 'AES-256', 'TLS 1.3'].map((label) => (
                  <div key={label} className="bg-white rounded-xl border border-slate-200 px-4 py-3 text-center">
                    <span className="text-sm font-semibold text-slate-700">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Questions */}
        <section className="py-20 lg:py-24">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Have security questions?</h2>
            <p className="text-slate-500 mb-6">
              We&apos;re happy to walk through our security practices in detail.
            </p>
            <a
              href="mailto:security@payrollshield.cloud"
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Contact Security Team
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
