import React from 'react';
import Head from 'next/head';
import { MarketingNav, Footer } from '../components/landing';

export default function TermsPage() {
  return (
    <>
      <Head>
        <title>Terms of Service — PayrollShield</title>
        <meta name="description" content="PayrollShield Terms of Service. Read the terms and conditions governing your use of the PayrollShield platform." />
      </Head>

      <MarketingNav />

      <main className="pt-32 pb-20 lg:pt-40 lg:pb-28">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <p className="text-sm font-semibold text-brand-blue uppercase tracking-widest mb-4">Legal</p>
          <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Terms of Service</h1>
          <p className="text-sm text-slate-400 mb-12">Last updated: January 31, 2026</p>

          <div className="prose prose-slate max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">1. Acceptance of Terms</h2>
              <p className="text-slate-600 leading-relaxed">
                By accessing or using the PayrollShield platform (&ldquo;Service&rdquo;), you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you are using the Service on behalf of an organization, you represent that you have the authority to bind that organization to these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">2. Service Description</h2>
              <p className="text-slate-600 leading-relaxed">
                PayrollShield is a software-as-a-service platform that enables payroll teams to compare payroll runs, detect material changes, classify risk, generate AI-powered explanations, and maintain audit trails of review decisions. The Service is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">3. Account Registration</h2>
              <p className="text-slate-600 leading-relaxed">
                You must register an account to use the Service. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">4. User Responsibilities</h2>
              <p className="text-slate-600 leading-relaxed mb-3">As a user of the Service, you agree to:</p>
              <ul className="list-disc list-inside text-slate-600 space-y-1.5">
                <li>Provide accurate and complete information when creating your account</li>
                <li>Use the Service only for lawful purposes and in accordance with these Terms</li>
                <li>Ensure that any payroll data you upload complies with applicable data protection laws</li>
                <li>Obtain all necessary consents from data subjects whose information you process through the Service</li>
                <li>Not attempt to reverse-engineer, decompile, or disassemble any part of the Service</li>
                <li>Not use the Service to transmit malicious code, spam, or unauthorized content</li>
                <li>Not share your account credentials with unauthorized parties</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">5. Data Ownership</h2>
              <p className="text-slate-600 leading-relaxed">
                You retain all ownership rights to the payroll data you upload to the Service. We do not claim any ownership interest in your data. We use your data solely to provide the Service as described in our Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">6. Subscription & Billing</h2>
              <p className="text-slate-600 leading-relaxed">
                Paid plans are billed in advance on a monthly or annual basis. Prices are subject to change with 30 days&apos; notice. Free trial periods, if offered, automatically convert to paid subscriptions unless cancelled before the trial period ends. Refunds are not issued for partial billing periods.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">7. Limitation of Liability</h2>
              <p className="text-slate-600 leading-relaxed">
                To the maximum extent permitted by applicable law, PayrollShield and its affiliates, officers, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, revenue, data, or business opportunities arising from your use of or inability to use the Service. Our total aggregate liability for any claims arising from these Terms shall not exceed the amount you paid to us in the twelve (12) months preceding the claim.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">8. Disclaimer of Warranties</h2>
              <p className="text-slate-600 leading-relaxed">
                The Service is provided &ldquo;as is&rdquo; without warranties of any kind, whether express, implied, or statutory, including but not limited to warranties of merchantability, fitness for a particular purpose, and non-infringement. PayrollShield does not warrant that the Service will be uninterrupted, error-free, or that defects will be corrected. The Service provides decision-support tools and does not constitute financial, legal, or tax advice.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">9. Indemnification</h2>
              <p className="text-slate-600 leading-relaxed">
                You agree to indemnify and hold harmless PayrollShield from any claims, damages, losses, liabilities, and expenses (including reasonable attorneys&apos; fees) arising from your use of the Service, your violation of these Terms, or your violation of any rights of a third party.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">10. Termination</h2>
              <p className="text-slate-600 leading-relaxed">
                Either party may terminate these Terms at any time. You may terminate by cancelling your subscription and deleting your account. We may terminate or suspend your access to the Service immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users or our business. Upon termination, your right to use the Service ceases immediately. We will delete your data within 30 days of account termination unless retention is required by law.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">11. Modifications to Terms</h2>
              <p className="text-slate-600 leading-relaxed">
                We reserve the right to modify these Terms at any time. Material changes will be communicated via email or through the Service at least 30 days before they take effect. Your continued use of the Service after the effective date of any changes constitutes acceptance of the modified Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">12. Governing Law</h2>
              <p className="text-slate-600 leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law principles. Any disputes arising under these Terms shall be resolved in the state or federal courts located in Delaware.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">13. Contact</h2>
              <p className="text-slate-600 leading-relaxed">
                For questions about these Terms, contact us at:<br />
                <a href="mailto:legal@payrollshield.cloud" className="text-brand-blue hover:underline">legal@payrollshield.cloud</a>
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
