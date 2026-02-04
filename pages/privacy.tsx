import React from 'react';
import Head from 'next/head';
import { MarketingNav, Footer } from '../components/landing';

export default function PrivacyPage() {
  return (
    <>
      <Head>
        <title>Privacy Policy — PayrollShield</title>
        <meta name="description" content="PayrollShield Privacy Policy. Learn how we collect, use, store, and protect your data." />
      </Head>

      <MarketingNav />

      <main className="pt-48 pb-20 lg:pt-56 lg:pb-28">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <p className="text-sm font-semibold text-brand-blue uppercase tracking-widest mb-4">Legal</p>
          <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-slate-400 mb-12">Last updated: January 31, 2026</p>

          <div className="prose prose-slate max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">1. Introduction</h2>
              <p className="text-slate-600 leading-relaxed">
                PayrollShield (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is committed to protecting the privacy and security of your personal information and the payroll data you process through our platform. This Privacy Policy describes how we collect, use, disclose, and protect information when you use the PayrollShield service (&ldquo;Service&rdquo;).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">2. Information We Collect</h2>
              <p className="text-slate-600 leading-relaxed mb-3"><strong>Account Information:</strong> When you create an account, we collect your email address and an encrypted password. If your organization uses single sign-on (SSO), we receive your identity from the identity provider.</p>
              <p className="text-slate-600 leading-relaxed mb-3"><strong>Payroll Data:</strong> When you upload payroll files for review, we process the data fields necessary for change detection, including employee identifiers, compensation amounts, and deduction components. Payroll data is scoped to your organization and not shared across accounts.</p>
              <p className="text-slate-600 leading-relaxed mb-3"><strong>Usage Data:</strong> We collect information about how you interact with the Service, including pages viewed, features used, review decisions, and timestamps. This data helps us improve the product and troubleshoot issues.</p>
              <p className="text-slate-600 leading-relaxed"><strong>Technical Data:</strong> We automatically collect IP addresses, browser type, device identifiers, and similar technical information through standard web server logs and analytics tools.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">3. How We Use Your Data</h2>
              <p className="text-slate-600 leading-relaxed mb-3">We use your information to:</p>
              <ul className="list-disc list-inside text-slate-600 space-y-1.5">
                <li>Provide, operate, and maintain the PayrollShield Service</li>
                <li>Perform payroll change detection and generate materiality assessments</li>
                <li>Provide contextual review guidance for flagged changes using expert-written rule metadata</li>
                <li>Maintain audit trails of review sessions and approval decisions</li>
                <li>Send transactional communications (account verification, security alerts)</li>
                <li>Improve the Service through aggregated, anonymized usage analytics</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">4. Data Storage & Security</h2>
              <p className="text-slate-600 leading-relaxed mb-3">
                All data is encrypted at rest using AES-256 and in transit using TLS 1.3. Payroll data is stored in isolated, organization-scoped databases with row-level security enforced at the database layer.
              </p>
              <p className="text-slate-600 leading-relaxed">
                We retain payroll data only for as long as necessary to provide the Service. You may request deletion of your data at any time by contacting us. Upon account termination, all payroll data is permanently deleted within 30 days.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">5. Data Sharing</h2>
              <p className="text-slate-600 leading-relaxed mb-3">
                We do not sell your personal information or payroll data. We may share information with:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-1.5">
                <li><strong>Infrastructure providers</strong> that host and operate the Service (subject to data processing agreements)</li>
                <li><strong>AI service providers</strong> for CSV column mapping during file import (only column headers are sent; not used for model training)</li>
                <li><strong>Law enforcement</strong> when required by applicable law, court order, or government regulation</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">6. Your Rights</h2>
              <p className="text-slate-600 leading-relaxed mb-3">
                Depending on your jurisdiction, you may have the right to:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-1.5">
                <li>Access the personal data we hold about you</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Export your data in a machine-readable format</li>
                <li>Object to or restrict certain processing activities</li>
                <li>Withdraw consent where processing is based on consent</li>
              </ul>
              <p className="text-slate-600 leading-relaxed mt-3">
                To exercise any of these rights, contact us at <a href="mailto:privacy@payrollshield.cloud" className="text-brand-blue hover:underline">privacy@payrollshield.cloud</a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">7. Cookies</h2>
              <p className="text-slate-600 leading-relaxed">
                We use essential cookies to maintain your authentication session and preferences. We do not use advertising or third-party tracking cookies. Analytics, if enabled, use anonymized, cookieless measurement.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">8. Changes to This Policy</h2>
              <p className="text-slate-600 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on our website and, where appropriate, by email. Your continued use of the Service after changes constitutes acceptance.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">9. Contact</h2>
              <p className="text-slate-600 leading-relaxed">
                For privacy-related questions or requests, contact us at:<br />
                <a href="mailto:privacy@payrollshield.cloud" className="text-brand-blue hover:underline">privacy@payrollshield.cloud</a>
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
