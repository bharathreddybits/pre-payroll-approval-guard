import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { MarketingNav, Footer } from '../components/landing';
import { ArrowLeft } from 'lucide-react';

export default function RefundPolicyPage() {
  return (
    <>
      <Head>
        <title>Refund Policy — PayrollShield</title>
        <meta name="description" content="PayrollShield refund policy. 7-day money-back guarantee on all subscription plans." />
      </Head>

      <MarketingNav />

      <main className="min-h-screen bg-white pt-48 pb-20 lg:pt-56 lg:pb-28">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          {/* Back Link */}
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-brand-blue mb-8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Pricing
          </Link>

          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
              Refund Policy
            </h1>
            <p className="text-lg text-slate-500">
              Last updated: May 9, 2026
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-slate max-w-none">
            {/* 7-Day Money-Back Guarantee */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                7-Day Money-Back Guarantee
              </h2>
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <p className="text-slate-700 font-medium mb-2">
                  We offer a <strong>7-day money-back guarantee</strong> on all PayrollShield subscription plans.
                </p>
                <p className="text-slate-600 text-sm">
                  If you're not satisfied with PayrollShield for any reason, you can request a full refund within 7 days of your initial purchase.
                </p>
              </div>

              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                What qualifies for a refund?
              </h3>
              <ul className="space-y-2 mb-6">
                <li className="text-slate-700">
                  <strong>First-time subscriptions:</strong> You can request a full refund within 7 days of your initial subscription date.
                </li>
                <li className="text-slate-700">
                  <strong>Annual plans:</strong> Full refund available within 7 days of purchase.
                </li>
                <li className="text-slate-700">
                  <strong>Monthly plans:</strong> Full refund available within 7 days of your first payment.
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                What does NOT qualify for a refund?
              </h3>
              <ul className="space-y-2 mb-6">
                <li className="text-slate-700">
                  <strong>After 7 days:</strong> Refunds are not available after the 7-day guarantee period has ended.
                </li>
                <li className="text-slate-700">
                  <strong>Partial billing periods:</strong> We do not prorate or refund for partial months/years after the guarantee period.
                </li>
                <li className="text-slate-700">
                  <strong>Plan changes:</strong> Upgrades and downgrades are not eligible for refunds. When you change plans, you'll be charged the difference or credited at the start of the next billing cycle.
                </li>
                <li className="text-slate-700">
                  <strong>Renewals:</strong> Subscription renewals (monthly or annual) are not eligible for refunds. The 7-day guarantee only applies to initial purchases.
                </li>
              </ul>
            </section>

            {/* Free Trial */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                Free Trial Period
              </h2>
              <p className="text-slate-700 mb-4">
                All new PayrollShield subscriptions include a <strong>7-day free trial</strong> with full access to all features of your chosen plan.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="text-slate-700">
                  <strong>No credit card required:</strong> You can start your free trial without entering payment information.
                </li>
                <li className="text-slate-700">
                  <strong>No automatic charges:</strong> Your subscription will only begin (and billing will start) after you explicitly choose to continue beyond the trial period.
                </li>
                <li className="text-slate-700">
                  <strong>Cancel anytime:</strong> You can cancel your trial at any time with no charges.
                </li>
              </ul>
            </section>

            {/* How to Request a Refund */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                How to Request a Refund
              </h2>
              <p className="text-slate-700 mb-4">
                If you'd like to request a refund within the 7-day guarantee period:
              </p>
              <ol className="list-decimal list-inside space-y-3 mb-6">
                <li className="text-slate-700">
                  <strong>Contact our support team</strong> via email at{' '}
                  <a href="mailto:support@payrollshield.com" className="text-brand-blue hover:underline">
                    support@payrollshield.com
                  </a>
                </li>
                <li className="text-slate-700">
                  <strong>Include your account email</strong> and subscription details
                </li>
                <li className="text-slate-700">
                  <strong>Brief reason for the refund</strong> (optional, but helps us improve)
                </li>
              </ol>
              <p className="text-slate-700">
                Refunds are typically processed within <strong>3-5 business days</strong> and will be credited back to your original payment method.
              </p>
            </section>

            {/* Cancellation Policy */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                Cancellation Policy
              </h2>
              <p className="text-slate-700 mb-4">
                You can cancel your PayrollShield subscription at any time from your account settings.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="text-slate-700">
                  <strong>Monthly subscriptions:</strong> When you cancel, you'll retain access until the end of your current billing period. No refund for the current month.
                </li>
                <li className="text-slate-700">
                  <strong>Annual subscriptions:</strong> When you cancel, you'll retain access until the end of your annual term. No refund for the remaining months.
                </li>
                <li className="text-slate-700">
                  <strong>No cancellation fees:</strong> There are no fees or penalties for canceling your subscription.
                </li>
              </ul>
            </section>

            {/* Exceptions */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                Exceptions and Special Circumstances
              </h2>
              <p className="text-slate-700 mb-4">
                We understand that unusual situations may arise. If you have special circumstances not covered by this policy, please contact our support team at{' '}
                <a href="mailto:support@payrollshield.com" className="text-brand-blue hover:underline">
                  support@payrollshield.com
                </a>.
              </p>
              <p className="text-slate-700 mb-4">
                We'll review your case and work with you to find a fair solution.
              </p>
            </section>

            {/* Changes to Policy */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                Changes to This Policy
              </h2>
              <p className="text-slate-700">
                We may update this refund policy from time to time. Any changes will be posted on this page with an updated "Last updated" date. Your continued use of PayrollShield after changes are posted constitutes acceptance of the updated policy.
              </p>
            </section>

            {/* Contact */}
            <section className="bg-slate-50 border border-slate-200 rounded-lg p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                Questions?
              </h2>
              <p className="text-slate-700 mb-4">
                If you have any questions about our refund policy, please don't hesitate to contact us:
              </p>
              <ul className="space-y-2">
                <li className="text-slate-700">
                  <strong>Email:</strong>{' '}
                  <a href="mailto:support@payrollshield.com" className="text-brand-blue hover:underline">
                    support@payrollshield.com
                  </a>
                </li>
                <li className="text-slate-700">
                  <strong>Response time:</strong> Within 24 hours (typically faster)
                </li>
              </ul>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
