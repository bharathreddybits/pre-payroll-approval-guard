import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Calculator, ShieldCheck, FileWarning, Users } from 'lucide-react';
import { useInView } from '../../hooks/useInView';

const defaultValues = {
  employees: 200,
  runsPerYear: 26,
  rerunsPerYear: 3,
  rerunCost: 5000,
  hasComplianceExposure: true,
};

export function ROISection() {
  const { ref, isVisible } = useInView({ threshold: 0.1 });

  const [employees, setEmployees] = useState(defaultValues.employees);
  const [runsPerYear, setRunsPerYear] = useState(defaultValues.runsPerYear);
  const [rerunsPerYear, setRerunsPerYear] = useState(defaultValues.rerunsPerYear);
  const [rerunCost, setRerunCost] = useState(defaultValues.rerunCost);
  const [hasCompliance, setHasCompliance] = useState(defaultValues.hasComplianceExposure);

  const results = useMemo(() => {
    const preventableRate = 0.73;
    const totalRerunCost = rerunsPerYear * rerunCost;
    const preventableCost = totalRerunCost * preventableRate;

    const complianceRisk = hasCompliance ? rerunsPerYear * 2500 : 0;
    const operationalCost = (employees / 100) * runsPerYear * 15;

    const totalSavings = preventableCost + complianceRisk + operationalCost;
    const annualSubscription = 249 * 12;
    const roiMultiple = totalSavings > 0 ? Math.round(totalSavings / annualSubscription) : 0;
    const preventableReruns = Math.round(rerunsPerYear * preventableRate * 10) / 10;

    return {
      totalRerunCost,
      preventableCost,
      complianceRisk,
      operationalCost,
      totalSavings,
      roiMultiple,
      preventableReruns,
      preventableRate: Math.round(preventableRate * 100),
    };
  }, [employees, runsPerYear, rerunsPerYear, rerunCost, hasCompliance]);

  return (
    <section ref={ref} className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Intro copy */}
        <div className={`max-w-3xl mx-auto text-center mb-16 scroll-fade-in ${isVisible ? 'is-visible' : ''}`}>
          <p className="text-sm font-semibold text-brand-blue uppercase tracking-widest mb-4">
            ROI
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 mb-6">
            Preventing one payroll rerun pays for PayrollShield multiple times over
          </h2>
          <div className="text-slate-500 space-y-2">
            <p>PayrollShield prevents payroll reruns, compliance penalties, emergency correction work, and loss of trust with Finance, Legal, and leadership.</p>
          </div>
        </div>

        {/* Calculator */}
        <div className={`max-w-5xl mx-auto scroll-fade-in scroll-delay-2 ${isVisible ? 'is-visible' : ''}`}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-brand-blue" />
                <h3 className="font-semibold text-slate-900">Calculate Your Payroll Risk Exposure</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
              {/* Inputs */}
              <div className="p-6 space-y-5">
                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Inputs</h4>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Employees per payroll
                  </label>
                  <input
                    type="number"
                    value={employees}
                    onChange={(e) => setEmployees(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Payroll runs per year
                  </label>
                  <input
                    type="number"
                    value={runsPerYear}
                    onChange={(e) => setRunsPerYear(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Average reruns per year
                  </label>
                  <input
                    type="number"
                    value={rerunsPerYear}
                    onChange={(e) => setRerunsPerYear(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Average rerun cost ($)
                  </label>
                  <input
                    type="number"
                    value={rerunCost}
                    onChange={(e) => setRerunCost(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Compliance exposure?
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setHasCompliance(true)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        hasCompliance
                          ? 'bg-brand-blue text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setHasCompliance(false)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        !hasCompliance
                          ? 'bg-brand-blue text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              </div>

              {/* Results */}
              <div className="p-6 bg-slate-50/50">
                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-5">Results</h4>

                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
                    <ShieldCheck className="h-5 w-5 text-brand-red flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Rerun Cost (Preventable)</p>
                      <p className="text-lg font-bold text-slate-900">${results.preventableCost.toLocaleString()}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Blocker rules, net pay mismatches, gross/earnings mismatches, tax errors</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
                    <FileWarning className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Compliance Risk Cost</p>
                      <p className="text-lg font-bold text-slate-900">${results.complianceRisk.toLocaleString()}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Missing federal/FICA tax, state tax, 401k IRS limits, negative taxes</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
                    <Users className="h-5 w-5 text-brand-blue flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Operational Cost</p>
                      <p className="text-lg font-bold text-slate-900">${results.operationalCost.toLocaleString()}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Duplicate employees, missing IDs, baseline drift issues</p>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="p-4 bg-gradient-to-r from-brand-blue to-brand-blue-dark rounded-xl text-white mb-4">
                  <p className="text-sm text-blue-200 mb-1">Total Estimated Annual Savings</p>
                  <p className="text-3xl font-extrabold">${results.totalSavings.toLocaleString()}</p>
                </div>

                <div className="space-y-3 text-sm">
                  <p className="text-slate-600">
                    Based on your inputs, <span className="font-bold text-slate-900">{results.preventableRate}%</span> of historical payroll reruns are preventable by rules already encoded in PayrollShield.
                  </p>
                  {results.roiMultiple > 0 && (
                    <p className="text-slate-600">
                      Preventing one rerun covers your subscription{' '}
                      <span className="font-bold text-brand-blue">{results.roiMultiple}&times;</span>.
                    </p>
                  )}
                </div>

                <Link
                  href="/signup"
                  className="block w-full text-center mt-6 px-6 py-3 bg-brand-blue text-white rounded-lg font-semibold hover:bg-brand-blue-dark transition-colors"
                >
                  Start Free Trial
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
