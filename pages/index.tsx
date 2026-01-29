import { NextPage } from 'next';
import Head from 'next/head';
import { Header } from '../components/Header';
import {
  LandingHero,
  ProblemSection,
  HowItWorks,
  FeaturesGrid,
  PricingSection,
  FAQ,
  FinalCTA,
  Footer,
} from '../components/landing';

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Pre-Payroll Approval Guard - Stop $50K Payroll Mistakes</title>
        <meta
          name="description"
          content="Automatically detect and flag material payroll changes. Review everything in under 5 minutes with complete audit trail. Start your 14-day free trial."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />

      <main>
        <LandingHero />
        <ProblemSection />
        <HowItWorks />
        <FeaturesGrid />
        <PricingSection />
        <FAQ />
        <FinalCTA />
      </main>

      <Footer />
    </>
  );
};

export default Home;
