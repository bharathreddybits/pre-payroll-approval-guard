import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import {
  MarketingNav,
  LandingHero,
  TrustSignal,
  CoreValues,
  HowItWorks,
  Footer,
} from '../components/landing';

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>PayrollShield — Pre-Payroll Approval Guard</title>
        <meta
          name="description"
          content="PayrollShield compares every payroll cycle, surfaces material changes and blockers automatically, and creates a complete audit trail. Review in minutes, not hours."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <MarketingNav />

      <main>
        <LandingHero />
        <TrustSignal />
        <CoreValues />
        <HowItWorks />

        {/* Final CTA */}
        <section className="py-20 lg:py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
          <div className="absolute top-0 left-1/3 w-[500px] h-[300px] bg-brand-blue/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[250px] bg-brand-red/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative max-w-7xl mx-auto px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Stop reviewing payroll in the dark
            </h2>
            <p className="text-lg text-slate-400 mb-8 max-w-xl mx-auto">
              Start your free trial and upload your first payroll file. See every change before you approve.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-white bg-gradient-to-r from-brand-blue to-brand-blue-dark rounded-lg hover:shadow-xl hover:shadow-brand-blue/30 hover:-translate-y-0.5 transition-all duration-300"
            >
              Start Free Trial
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default Home;
