import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { Button } from '../components/ui/button';

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Pre-Payroll Approval Guard</title>
        <meta name="description" content="Detect and flag material payroll changes before processing" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen py-16 flex flex-col justify-center items-center bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Pre-Payroll Approval Guard
            </h1>

            <p className="text-xl text-gray-600 mb-8">
              Avoid $50K mistakes. Review material payroll changes in under 5 minutes.
            </p>

            <Link href="/upload">
              <Button size="lg" className="text-lg px-8 py-6">
                Upload Payroll Data
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
            <Link href="/upload">
              <div className="card hover:shadow-lg transition-shadow cursor-pointer h-full">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">📤</div>
                  <div>
                    <h2 className="text-2xl font-semibold mb-2 text-gray-900">
                      Upload Payroll
                    </h2>
                    <p className="text-gray-600">
                      Upload baseline and current CSV files for automated comparison
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            <div className="card hover:shadow-lg transition-shadow cursor-not-allowed h-full opacity-75">
              <div className="flex items-start gap-4">
                <div className="text-4xl">🔍</div>
                <div>
                  <h2 className="text-2xl font-semibold mb-2 text-gray-900">
                    Review Changes
                  </h2>
                  <p className="text-gray-600">
                    One-screen view of all material changes, blockers, and approval actions
                  </p>
                </div>
              </div>
            </div>

            <div className="card hover:shadow-lg transition-shadow cursor-not-allowed h-full opacity-75">
              <div className="flex items-start gap-4">
                <div className="text-4xl">✅</div>
                <div>
                  <h2 className="text-2xl font-semibold mb-2 text-gray-900">
                    Approve Payroll
                  </h2>
                  <p className="text-gray-600">
                    Approve or reject with full audit trail and blocker validation
                  </p>
                </div>
              </div>
            </div>

            <div className="card hover:shadow-lg transition-shadow cursor-not-allowed h-full opacity-75">
              <div className="flex items-start gap-4">
                <div className="text-4xl">📊</div>
                <div>
                  <h2 className="text-2xl font-semibold mb-2 text-gray-900">
                    Audit Trail
                  </h2>
                  <p className="text-gray-600">
                    Complete history of all approvals and changes for compliance
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-4xl mx-auto">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">How It Works</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl mb-2">1️⃣</div>
                <h4 className="font-semibold text-gray-900 mb-1">Upload</h4>
                <p className="text-sm text-gray-600">Upload baseline and current CSV files</p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">2️⃣</div>
                <h4 className="font-semibold text-gray-900 mb-1">Process</h4>
                <p className="text-sm text-gray-600">Automated diff calculation and judgement rules</p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">3️⃣</div>
                <h4 className="font-semibold text-gray-900 mb-1">Review</h4>
                <p className="text-sm text-gray-600">See material changes and blockers in one screen</p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">4️⃣</div>
                <h4 className="font-semibold text-gray-900 mb-1">Approve</h4>
                <p className="text-sm text-gray-600">Approve with confidence and full audit trail</p>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Built with the WAT Framework (Workflows, Agents, Tools) • Powered by deterministic rules
            </p>
          </div>
        </div>
      </main>
    </>
  );
};

export default Home;
