import { NextPage } from 'next';
import Head from 'next/head';
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
      </main>

      <Footer />
    </>
  );
};

export default Home;
