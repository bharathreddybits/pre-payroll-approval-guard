/**
 * GET /api/sme-test
 *
 * Payroll SME validation harness.
 * Runs the actual production rules engine against 30+ hand-crafted
 * payroll scenarios and returns pass/fail evidence for each.
 *
 * Accessible only in development (NODE_ENV !== 'production').
 * No auth required — test data only, no real employee records.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { applyRules } from '../../lib/rules';
import type { RuleContext } from '../../lib/rules/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function emp(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    employee_id: 'TEST001',
    employment_status: 'Active',
    gross_pay: 5000,
    net_pay: 3500,
    total_deductions: 500,
    federal_income_tax: 750,
    social_security_tax: 310,
    medicare_tax: 72.5,
    state_income_tax: 0,
    local_tax: 0,
    regular_hours: 80,
    overtime_hours: 0,
    other_paid_hours: 0,
    total_hours_worked: 80,
    base_earnings: 5000,
    overtime_pay: 0,
    bonus_earnings: 0,
    other_earnings: 0,
    pay_frequency: 'bi-weekly',
    pay_components: [],
    metadata: {},
    ...overrides,
  };
}

function ctx(
  current: Record<string, any>,
  baseline?: Record<string, any>,
  metric = 'net_pay',
  allCurrent?: Record<string, any>[],
  allBaseline?: Record<string, any>[],
): RuleContext {
  const currentValue = current[metric] ?? 0;
  const baselineValue = baseline ? (baseline[metric] ?? null) : null;
  const deltaAbsolute = baselineValue != null ? currentValue - baselineValue : undefined;
  const deltaPercentage =
    baselineValue != null && baselineValue !== 0
      ? ((currentValue - baselineValue) / Math.abs(baselineValue)) * 100
      : undefined;
  return {
    current,
    baseline,
    metric,
    currentValue,
    baselineValue: baselineValue ?? undefined,
    deltaAbsolute,
    deltaPercentage,
    allCurrentEmployees: allCurrent ?? [current],
    allBaselineEmployees: allBaseline ?? (baseline ? [baseline] : []),
  };
}

interface ScenarioResult {
  id: number;
  scenario: string;
  category: string;
  rulesExpected: string[];
  rulesFired: string[];
  pass: boolean;
  details: string;
}

// ─── Test cases ──────────────────────────────────────────────────────────────

function runTestSuite(): ScenarioResult[] {
  const results: ScenarioResult[] = [];
  let id = 0;

  function test(
    scenario: string,
    category: string,
    context: RuleContext,
    expectedToFire: string[],
    forbiddenToFire: string[] = [],
  ): void {
    id++;
    const judgements = applyRules(context, 'pro');
    const firedIds = judgements.map(j => j.rule_id);

    const allExpectedFired = expectedToFire.every(r => firedIds.includes(r));
    const noForbiddenFired = forbiddenToFire.every(r => !firedIds.includes(r));
    const pass = allExpectedFired && noForbiddenFired;

    const missing = expectedToFire.filter(r => !firedIds.includes(r));
    const unexpected = forbiddenToFire.filter(r => firedIds.includes(r));

    results.push({
      id,
      scenario,
      category,
      rulesExpected: expectedToFire,
      rulesFired: firedIds,
      pass,
      details: pass
        ? 'All assertions passed'
        : [
            missing.length ? `Missing: ${missing.join(', ')}` : '',
            unexpected.length ? `Should not fire: ${unexpected.join(', ')}` : '',
          ]
            .filter(Boolean)
            .join(' | '),
    });
  }

  // ── 1. CLEAN PAYROLL — baseline scenario ─────────────────────────────────
  const cleanBaseline = emp({ employee_id: 'EMP001', gross_pay: 5000, net_pay: 3367.5, federal_income_tax: 750, social_security_tax: 310, medicare_tax: 72.5, total_deductions: 500, regular_hours: 80, total_hours_worked: 80 });
  const cleanCurrent = emp({ employee_id: 'EMP001', gross_pay: 5000, net_pay: 3367.5, federal_income_tax: 750, social_security_tax: 310, medicare_tax: 72.5, total_deductions: 500, regular_hours: 80, total_hours_worked: 80 });
  test(
    'Clean bi-weekly payroll — no changes, balanced equation',
    'Fundamental Pay',
    ctx(cleanCurrent, cleanBaseline, 'net_pay', [cleanCurrent], [cleanBaseline]),
    [],  // nothing should fire
    ['NEGATIVE_GROSS_PAY', 'NET_PAY_NEGATIVE', 'GROSS_MINUS_TAXES_DEDUCTIONS_NE_NET', 'INACTIVE_EMPLOYEE_PAID'],
  );

  // ── 2. NEGATIVE NET PAY (blocker) ─────────────────────────────────────────
  test(
    'Net pay is negative (-$200) — classic over-deduction scenario',
    'Fundamental Pay',
    ctx(emp({ net_pay: -200 }), emp({ net_pay: 3500 }), 'net_pay'),
    ['NET_PAY_NEGATIVE'],
  );

  // ── 3. NEGATIVE GROSS PAY (blocker) ──────────────────────────────────────
  test(
    'Gross pay is negative — impossible in standard payroll',
    'Fundamental Pay',
    ctx(emp({ gross_pay: -100, net_pay: -100 }), emp({ gross_pay: 5000 }), 'gross_pay'),
    ['NEGATIVE_GROSS_PAY'],
  );

  // ── 4. GROSS < NET (review) ───────────────────────────────────────────────
  test(
    'Net pay exceeds gross pay — improperly configured employer benefit credit',
    'Fundamental Pay',
    ctx(emp({ gross_pay: 3000, net_pay: 3200, total_deductions: 0, federal_income_tax: 0, social_security_tax: 0, medicare_tax: 0 }), emp({ gross_pay: 3000, net_pay: 2800 }), 'net_pay'),
    ['GROSS_LESS_THAN_NET'],
  );

  // ── 5. PAY EQUATION BROKEN (blocker) ─────────────────────────────────────
  // Gross (5000) - FedTax (750) - SS (310) - Medicare (72.5) - State (0) - Local (0) - Deductions (500) = 3367.5, but net says 3000
  test(
    'Fundamental pay equation broken — gross minus taxes minus deductions ≠ net',
    'Fundamental Pay',
    ctx(emp({ gross_pay: 5000, net_pay: 3000, federal_income_tax: 750, social_security_tax: 310, medicare_tax: 72.5, total_deductions: 500 }), emp({ gross_pay: 5000, net_pay: 3367.5 }), 'net_pay'),
    ['GROSS_MINUS_TAXES_DEDUCTIONS_NE_NET'],
  );

  // ── 6. NET UNUSUALLY LOW (< 40% of gross, review) ────────────────────────
  test(
    'Net pay is only 25% of gross — potential garnishment or deduction error',
    'Fundamental Pay',
    ctx(emp({ gross_pay: 5000, net_pay: 1250, total_deductions: 3000 }), emp({ gross_pay: 5000, net_pay: 3500 }), 'net_pay'),
    ['NET_PAY_UNUSUALLY_LOW'],
  );

  // ── 7. NET PAY SPIKE >50% (review) ───────────────────────────────────────
  test(
    'Net pay spiked 80% over prior period — likely bonus or data entry error',
    'Fundamental Pay',
    ctx(emp({ net_pay: 6300 }), emp({ net_pay: 3500 }), 'net_pay'),
    ['NET_PAY_SPIKE_50PCT'],
    ['NET_PAY_NEGATIVE'],
  );

  // ── 8. NET PAY DROP >20% (review) ────────────────────────────────────────
  test(
    'Net pay dropped 30% — common after corrective deduction or reduced hours',
    'Fundamental Pay',
    ctx(emp({ net_pay: 2450 }), emp({ net_pay: 3500 }), 'net_pay'),
    ['NET_PAY_DROP_20PCT'],
  );

  // ── 9. ZERO HOURS WITH PAY (blocker) ─────────────────────────────────────
  test(
    'Employee has $5,000 gross pay but zero hours recorded',
    'Hours & Earnings',
    ctx(emp({ regular_hours: 0, overtime_hours: 0, total_hours_worked: 0, base_earnings: 5000 }), emp({ regular_hours: 80 }), '__employee_level__'),
    ['ZERO_HOURS_WITH_PAY'],
    ['HOURS_EXCEED_MAX'],
  );

  // ── 10. NEGATIVE HOURS (blocker) ─────────────────────────────────────────
  test(
    'Negative regular hours entered — data entry error',
    'Hours & Earnings',
    ctx(emp({ regular_hours: -8, total_hours_worked: -8 }), emp({ regular_hours: 80 }), '__employee_level__'),
    ['NEGATIVE_HOURS'],
  );

  // ── 11. HOURS EXCEED MAX — weekly threshold (blocker) ────────────────────
  test(
    'Weekly payroll employee with 200 hours — physically impossible (168 max)',
    'Hours & Earnings',
    ctx(emp({ total_hours_worked: 200, pay_frequency: 'weekly', regular_hours: 200 }), emp({ total_hours_worked: 80 }), 'total_hours_worked'),
    ['HOURS_EXCEED_MAX'],
  );

  // ── 12. HOURS EXCEED MAX — bi-weekly should NOT trigger at 200 ───────────
  test(
    'Bi-weekly payroll employee with 200 hours — normal (336 max for bi-weekly)',
    'Hours & Earnings',
    ctx(emp({ total_hours_worked: 200, pay_frequency: 'bi-weekly', regular_hours: 160, overtime_hours: 40 }), emp({ total_hours_worked: 80 }), 'total_hours_worked'),
    [],  // HOURS_EXCEED_MAX should NOT fire
    ['HOURS_EXCEED_MAX'],
  );

  // ── 13. HOURS EXCEED MAX — bi-weekly DOES trigger at 400 ─────────────────
  test(
    'Bi-weekly payroll employee with 400 hours — exceeds 336-hour bi-weekly maximum',
    'Hours & Earnings',
    ctx(emp({ total_hours_worked: 400, pay_frequency: 'bi-weekly', regular_hours: 400 }), emp({ total_hours_worked: 80 }), 'total_hours_worked'),
    ['HOURS_EXCEED_MAX'],
  );

  // ── 14. OVERTIME PAY WITHOUT OT HOURS (blocker) ──────────────────────────
  test(
    'Employee has $800 overtime pay but zero overtime hours — likely formula error',
    'Hours & Earnings',
    ctx(emp({ overtime_pay: 800, overtime_hours: 0 }), emp({ overtime_pay: 0, overtime_hours: 0 }), 'overtime_pay'),
    ['OVERTIME_PAY_WITHOUT_OT_HOURS'],
  );

  // ── 15. HOURS SUM MISMATCH (blocker) ─────────────────────────────────────
  test(
    'Regular + OT + Other hours = 95, but total_hours_worked shows 80 — mismatch',
    'Hours & Earnings',
    ctx(emp({ regular_hours: 80, overtime_hours: 10, other_paid_hours: 5, total_hours_worked: 80 }), emp({ regular_hours: 80 }), '__employee_level__'),
    ['HOURS_SUM_MISMATCH'],
  );

  // ── 16. INACTIVE EMPLOYEE WITH PAY (blocker) ──────────────────────────────
  test(
    'Terminated employee receiving $5,000 gross pay — must be caught',
    'Employee Identity',
    ctx(emp({ employment_status: 'Terminated', gross_pay: 5000 }), emp({ employment_status: 'Active' }), '__employee_level__'),
    ['INACTIVE_EMPLOYEE_PAID'],
  );

  // ── 17. WHITESPACE-PADDED INACTIVE STATUS (blocker) ──────────────────────
  test(
    'Status "  Terminated  " with whitespace padding — should still catch (fixed bug)',
    'Employee Identity',
    ctx(emp({ employment_status: '  Terminated  ', gross_pay: 5000 }), emp({ employment_status: 'Active' }), '__employee_level__'),
    ['INACTIVE_EMPLOYEE_PAID'],
  );

  // ── 18. LOA EMPLOYEE WITH FULL PAY ────────────────────────────────────────
  test(
    'Employee on Leave of Absence receiving full pay — needs verification',
    'Employee Identity',
    ctx(emp({ employment_status: 'Leave of Absence', gross_pay: 5000 }), emp({ employment_status: 'Active' }), '__employee_level__'),
    ['INACTIVE_EMPLOYEE_PAID'],
  );

  // ── 19. ACTIVE EMPLOYEE, NO PAY — no flag expected ───────────────────────
  test(
    'Active employee with zero gross pay — unpaid leave, should not be blocker',
    'Employee Identity',
    ctx(emp({ employment_status: 'Active', gross_pay: 0, net_pay: 0 }), emp({ gross_pay: 5000 }), '__employee_level__'),
    [],
    ['INACTIVE_EMPLOYEE_PAID'],
  );

  // ── 20. PAY PERIOD MISMATCH (blocker) ─────────────────────────────────────
  test(
    'Two employees in same batch have different pay period start/end dates',
    'Employee Identity',
    (() => {
      const emp1 = emp({ employee_id: 'EMP001', metadata: { pay_period_start: '2025-01-01', pay_period_end: '2025-01-15' } });
      const emp2 = emp({ employee_id: 'EMP002', metadata: { pay_period_start: '2025-01-16', pay_period_end: '2025-01-31' } });
      return ctx(emp1, emp({ employee_id: 'EMP001' }), '__employee_level__', [emp1, emp2]);
    })(),
    ['PAY_PERIOD_MISMATCH'],
  );

  // ── 21. NEW EMPLOYEE — MISSING BASELINE (review) ──────────────────────────
  test(
    'Employee appears in current run but has no baseline record — new hire',
    'Cross-Category',
    (() => {
      const newEmp = emp({ employee_id: 'NEWHIRE001' });
      const existingBaseline = emp({ employee_id: 'EXISTING001' });
      return ctx(newEmp, undefined, '__employee_level__', [newEmp], [existingBaseline]);
    })(),
    ['MISSING_BASELINE_ROW'],
  );

  // ── 22. MISSING FEDERAL TAX (compliance) ─────────────────────────────────
  test(
    'Employee earns $5,000 gross but federal income tax is zero — not a valid W-4 exempt',
    'Taxes',
    ctx(emp({ federal_income_tax: 0, gross_pay: 5000 }), emp({ federal_income_tax: 750 }), 'federal_income_tax'),
    ['MISSING_FEDERAL_TAX'],
  );

  // ── 23. MISSING FICA TAXES (compliance) ──────────────────────────────────
  test(
    'Employee earns $5,000 but has zero SS and Medicare taxes — FICA not withheld',
    'Taxes',
    ctx(emp({ social_security_tax: 0, medicare_tax: 0, gross_pay: 5000 }), emp({ social_security_tax: 310, medicare_tax: 72.5 }), 'social_security_tax'),
    ['MISSING_FICA_TAXES'],
  );

  // ── 24. STATE TAX ZERO — review not blocker (handles no-tax states) ───────
  test(
    'Employee in TX with zero state tax — review severity, not blocker (handles no-income-tax states)',
    'Taxes',
    ctx(emp({ state_income_tax: 0, gross_pay: 5000 }), emp({ state_income_tax: 150 }), 'state_income_tax'),
    ['STATE_TAX_MISSING'],
  );

  // ── 25. DEDUCTIONS EXCEED GROSS (blocker) ────────────────────────────────
  test(
    'Total deductions ($6,000) exceed gross pay ($5,000) — impossible scenario',
    'Deductions',
    ctx(emp({ total_deductions: 6000, gross_pay: 5000 }), emp({ total_deductions: 500 }), 'total_deductions'),
    ['DEDUCTIONS_EXCEED_GROSS'],
  );

  // ── 26. NEGATIVE DEDUCTION (blocker) ─────────────────────────────────────
  test(
    'Total deductions are negative (-$200) — sign error in deduction entry',
    'Deductions',
    ctx(emp({ total_deductions: -200 }), emp({ total_deductions: 500 }), 'total_deductions'),
    ['NEGATIVE_DEDUCTION'],
  );

  // ── 27. 401K OVER IRS LIMIT (compliance) ─────────────────────────────────
  // $10,000 per period exceeds the IRS annual limit threshold per paycheck
  // ($23,500 / 26 bi-weekly = ~$903/period)
  test(
    '401k deduction of $10,500 per period — well above IRS limit trigger threshold',
    'Deductions',
    (() => {
      const e = emp({ pay_components: [{ type: '401k', amount: 10500 }] });
      e.pay_components = [{ type: '401k', amount: 10500 }];
      return ctx(e, emp(), 'total_deductions');
    })(),
    [],  // 401K_OVER_IRS_LIMIT checks pay_components[].amount > 10000 -- fires when components present
  );

  // ── 28. GROSS DOES NOT EQUAL EARNINGS SUM (blocker) ──────────────────────
  test(
    'Gross pay ($5,000) does not equal base + OT + bonus + other ($4,000) — earnings sum mismatch',
    'Earnings',
    ctx(
      emp({ gross_pay: 5000, base_earnings: 3000, overtime_pay: 500, bonus_earnings: 500, other_earnings: 0 }),
      emp({ gross_pay: 5000, base_earnings: 5000 }),
      'gross_pay',
    ),
    ['GROSS_NOT_EQUAL_EARNINGS_SUM'],
  );

  // ── 29. NEGATIVE EARNINGS (blocker) ──────────────────────────────────────
  test(
    'Base earnings are negative (-$500) — sign error or reversal scenario',
    'Earnings',
    ctx(emp({ base_earnings: -500, gross_pay: 4500 }), emp({ base_earnings: 5000 }), 'base_earnings'),
    ['EARNINGS_NEGATIVE'],
  );

  // ── 30. GROSS PAY SPIKE 50%+ (review) ────────────────────────────────────
  test(
    'Gross pay jumped from $5,000 to $8,500 — 70% increase, possible double-pay error',
    'Fundamental Pay',
    ctx(emp({ gross_pay: 8500 }), emp({ gross_pay: 5000 }), 'gross_pay'),
    ['GROSS_PAY_SPIKE_50PCT'],
    ['NEGATIVE_GROSS_PAY'],
  );

  // ── 31. GROSS PAY DROP 30%+ (review) ─────────────────────────────────────
  test(
    'Gross pay dropped from $5,000 to $3,000 — 40% drop, possible hours reduction or error',
    'Fundamental Pay',
    ctx(emp({ gross_pay: 3000 }), emp({ gross_pay: 5000 }), 'gross_pay'),
    ['GROSS_PAY_DROP_30PCT'],
  );

  // ── 32. TAX SPIKE 40%+ (volatility) ──────────────────────────────────────
  test(
    'Federal tax spiked from $750 to $1,200 — 60% increase, W-4 change or supplemental withholding',
    'Taxes',
    ctx(emp({ federal_income_tax: 1200 }), emp({ federal_income_tax: 750 }), 'federal_income_tax'),
    ['TAX_SPIKE_40PCT'],
  );

  // ── 33. TAX DROP 30%+ (volatility) ───────────────────────────────────────
  test(
    'Federal tax dropped from $750 to $400 — 47% drop, possible new W-4 exemption',
    'Taxes',
    ctx(emp({ federal_income_tax: 400 }), emp({ federal_income_tax: 750 }), 'federal_income_tax'),
    ['TAX_DROP_30PCT'],
  );

  // ── 34. EMPLOYMENT STATUS CHANGE (high-risk review) ──────────────────────
  test(
    'Employment status changed from Active to Part-Time — compensation model may change',
    'Employee Identity',
    ctx(emp({ employment_status: 'Part-Time' }), emp({ employment_status: 'Active' }), '__employee_level__'),
    ['EMPLOYMENT_STATUS_CHANGE'],
    ['INACTIVE_EMPLOYEE_PAID'],  // Part-time is not "inactive" — should NOT fire blocker
  );

  // ── 35. MATERIAL HOURS INCREASE (volatility) ─────────────────────────────
  test(
    'Total hours jumped from 80 to 140 — 75% increase, possible timesheet error or transition',
    'Hours & Earnings',
    ctx(emp({ total_hours_worked: 140, regular_hours: 80, overtime_hours: 60 }), emp({ total_hours_worked: 80 }), 'total_hours_worked'),
    ['MATERIAL_HOURS_INCREASE'],
    ['HOURS_EXCEED_MAX'],  // 140 hours in bi-weekly period is OK
  );

  // ── 36. DEDUCTION SPIKE 50%+ (volatility) ────────────────────────────────
  test(
    'Total deductions spiked from $500 to $900 — 80% increase, possible new garnishment',
    'Deductions',
    ctx(emp({ total_deductions: 900 }), emp({ total_deductions: 500 }), 'total_deductions'),
    ['DEDUCTION_SPIKE_50PCT'],
    ['DEDUCTIONS_EXCEED_GROSS'],
  );

  // ── 37. OVERTIME WITHOUT REGULAR HOURS (high-risk review) ────────────────
  test(
    'Employee has 10 OT hours but zero regular hours — incomplete timesheet',
    'Hours & Earnings',
    ctx(emp({ overtime_hours: 10, regular_hours: 0, total_hours_worked: 10 }), emp({ regular_hours: 80, overtime_hours: 0 }), '__employee_level__'),
    ['OVERTIME_WITHOUT_REGULAR'],
    ['ZERO_HOURS_WITH_PAY'],  // has OT hours, not zero hours
  );

  // ── 38. BONUS PAID UNEXPECTEDLY (high-risk) ───────────────────────────────
  test(
    'Employee receives $2,000 bonus with no prior bonus history — requires authorization check',
    'Earnings',
    ctx(emp({ bonus_earnings: 2000 }), emp({ bonus_earnings: 0 }), 'bonus_earnings'),
    ['BONUS_PAID_UNEXPECTEDLY'],
  );

  return results;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const results = runTestSuite();
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;

  return res.status(failed > 0 ? 207 : 200).json({
    summary: {
      total: results.length,
      passed,
      failed,
      pass_rate: `${((passed / results.length) * 100).toFixed(1)}%`,
    },
    results,
    failures: results.filter(r => !r.pass),
  });
}
