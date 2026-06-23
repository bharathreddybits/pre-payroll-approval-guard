/**
 * SME Rule Validation Test
 *
 * Runs the production rules engine against 45 hand-crafted payroll scenarios
 * covering every category a payroll SME would audit.
 *
 * Usage: npx tsx --env-file=.env scripts/dev/sme-rule-test.ts
 */

// Must load env before any imports that reference process.env
import { applyRules } from '../../lib/rules';
import type { RuleContext } from '../../lib/rules/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function emp(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    employee_id: 'TEST001',
    employment_status: 'Active',
    gross_pay: 5000,
    net_pay: 3367.5,
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
  metric = '__employee_level__',
  allCurrent?: Record<string, any>[],
  allBaseline?: Record<string, any>[],
): RuleContext {
  const currentValue = (metric !== '__employee_level__' ? current[metric] : 0) ?? 0;
  const baselineValue = (baseline && metric !== '__employee_level__') ? (baseline[metric] ?? null) : null;
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

interface Result {
  id: number;
  scenario: string;
  category: string;
  expectedToFire: string[];
  firedIds: string[];
  pass: boolean;
  details: string;
}

const results: Result[] = [];
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
    expectedToFire,
    firedIds,
    pass,
    details: pass
      ? 'PASS'
      : [
          missing.length ? `Expected but missing: [${missing.join(', ')}]` : '',
          unexpected.length ? `Should NOT fire: [${unexpected.join(', ')}]` : '',
        ].filter(Boolean).join(' | '),
  });
}

// ─── Test Cases ───────────────────────────────────────────────────────────────

// 1. Clean payroll — no flags expected
const cleanEmp = emp({ employee_id: 'EMP001', gross_pay: 5000, net_pay: 3367.5, federal_income_tax: 750, social_security_tax: 310, medicare_tax: 72.5, total_deductions: 500, regular_hours: 80, total_hours_worked: 80 });
test('Clean bi-weekly payroll — balanced equation, no changes', 'Fundamental Pay',
  ctx(cleanEmp, cleanEmp, 'net_pay', [cleanEmp], [cleanEmp]),
  [],
  ['NEGATIVE_GROSS_PAY', 'NET_PAY_NEGATIVE', 'GROSS_MINUS_TAXES_DEDUCTIONS_NE_NET', 'INACTIVE_EMPLOYEE_PAID']);

// 2. Negative net pay
test('Net pay is -$200', 'Fundamental Pay',
  ctx(emp({ net_pay: -200 }), emp({ net_pay: 3500 }), 'net_pay'),
  ['NET_PAY_NEGATIVE']);

// 3. Negative gross pay
test('Gross pay is -$100', 'Fundamental Pay',
  ctx(emp({ gross_pay: -100, net_pay: -100 }), emp({ gross_pay: 5000 }), 'gross_pay'),
  ['NEGATIVE_GROSS_PAY']);

// 4. Net exceeds gross
test('Net pay ($3,200) exceeds gross ($3,000)', 'Fundamental Pay',
  ctx(emp({ gross_pay: 3000, net_pay: 3200, total_deductions: 0, federal_income_tax: 0, social_security_tax: 0, medicare_tax: 0 }), emp({ gross_pay: 3000, net_pay: 2800 }), 'net_pay'),
  ['GROSS_LESS_THAN_NET']);

// 5. Pay equation broken: gross(5000) - taxes(1132.5) - deductions(500) = 3367.5 but net says 3000
test('Fundamental pay equation broken: Gross - Taxes - Deductions ≠ Net', 'Fundamental Pay',
  ctx(emp({ gross_pay: 5000, net_pay: 3000, federal_income_tax: 750, social_security_tax: 310, medicare_tax: 72.5, total_deductions: 500 }), emp({ net_pay: 3367.5 }), 'net_pay'),
  ['GROSS_MINUS_TAXES_DEDUCTIONS_NE_NET']);

// 6. Net unusually low (< 40% of gross)
test('Net pay ($1,250) is only 25% of gross ($5,000)', 'Fundamental Pay',
  ctx(emp({ gross_pay: 5000, net_pay: 1250, total_deductions: 3000 }), emp({ net_pay: 3500 }), 'net_pay'),
  ['NET_PAY_UNUSUALLY_LOW']);

// 7. Net pay spike >50%
test('Net pay spiked 80%: $3,500 → $6,300', 'Fundamental Pay',
  ctx(emp({ net_pay: 6300 }), emp({ net_pay: 3500 }), 'net_pay'),
  ['NET_PAY_SPIKE_50PCT'], ['NET_PAY_NEGATIVE']);

// 8. Net pay drop >20%
test('Net pay dropped 30%: $3,500 → $2,450', 'Fundamental Pay',
  ctx(emp({ net_pay: 2450 }), emp({ net_pay: 3500 }), 'net_pay'),
  ['NET_PAY_DROP_20PCT']);

// 9. Zero hours with pay
test('$5,000 gross pay but zero hours recorded', 'Hours & Earnings',
  ctx(emp({ regular_hours: 0, overtime_hours: 0, total_hours_worked: 0, base_earnings: 5000 }), emp({ regular_hours: 80 }), '__employee_level__'),
  ['ZERO_HOURS_WITH_PAY']);

// 10. Negative hours
test('Negative regular hours: -8', 'Hours & Earnings',
  ctx(emp({ regular_hours: -8, total_hours_worked: -8 }), emp({ regular_hours: 80 }), '__employee_level__'),
  ['NEGATIVE_HOURS']);

// 11. Hours exceed max — weekly threshold
test('Weekly employee with 200 hours — exceeds 168 max', 'Hours & Earnings',
  ctx(emp({ total_hours_worked: 200, pay_frequency: 'weekly', regular_hours: 200 }), emp({ total_hours_worked: 80 }), 'total_hours_worked'),
  ['HOURS_EXCEED_MAX']);

// 12. Bi-weekly 200 hours — should NOT trigger (336 max)
test('Bi-weekly employee with 200 hours — within 336 limit, should NOT flag', 'Hours & Earnings',
  ctx(emp({ total_hours_worked: 200, pay_frequency: 'bi-weekly', regular_hours: 160, overtime_hours: 40 }), emp({ total_hours_worked: 80 }), 'total_hours_worked'),
  [],
  ['HOURS_EXCEED_MAX']);

// 13. Bi-weekly 400 hours — exceeds 336 max
test('Bi-weekly employee with 400 hours — exceeds 336-hour bi-weekly max', 'Hours & Earnings',
  ctx(emp({ total_hours_worked: 400, pay_frequency: 'bi-weekly', regular_hours: 400 }), emp({ total_hours_worked: 80 }), 'total_hours_worked'),
  ['HOURS_EXCEED_MAX']);

// 14. OT pay without OT hours
test('$800 overtime pay but zero overtime hours', 'Hours & Earnings',
  ctx(emp({ overtime_pay: 800, overtime_hours: 0 }), emp({ overtime_pay: 0 }), 'overtime_pay'),
  ['OVERTIME_PAY_WITHOUT_OT_HOURS']);

// 15. Hours sum mismatch
test('Regular(80) + OT(10) + Other(5) = 95, but total says 80', 'Hours & Earnings',
  ctx(emp({ regular_hours: 80, overtime_hours: 10, other_paid_hours: 5, total_hours_worked: 80 }), emp({ regular_hours: 80 }), '__employee_level__'),
  ['HOURS_SUM_MISMATCH']);

// 16. Inactive employee with pay
test('"Terminated" status employee receiving $5,000 gross', 'Employee Identity',
  ctx(emp({ employment_status: 'Terminated', gross_pay: 5000 }), emp({ employment_status: 'Active' }), '__employee_level__'),
  ['INACTIVE_EMPLOYEE_PAID']);

// 17. Whitespace-padded inactive status
test('"  Terminated  " (whitespace-padded) with $5,000 gross — whitespace fix validation', 'Employee Identity',
  ctx(emp({ employment_status: '  Terminated  ', gross_pay: 5000 }), emp({ employment_status: 'Active' }), '__employee_level__'),
  ['INACTIVE_EMPLOYEE_PAID']);

// 18. LOA with full pay
test('"Leave of Absence" employee receiving $5,000 — should flag inactive-with-pay', 'Employee Identity',
  ctx(emp({ employment_status: 'Leave of Absence', gross_pay: 5000 }), emp({ employment_status: 'Active' }), '__employee_level__'),
  ['INACTIVE_EMPLOYEE_PAID']);

// 19. Active with zero pay — no flag expected
test('Active employee with zero gross pay — unpaid leave, valid scenario', 'Employee Identity',
  ctx(emp({ employment_status: 'Active', gross_pay: 0, net_pay: 0, federal_income_tax: 0, social_security_tax: 0, medicare_tax: 0 }), emp({ gross_pay: 5000 }), '__employee_level__'),
  [],
  ['INACTIVE_EMPLOYEE_PAID']);

// 20. Pay period mismatch across employees
test('Two employees with different pay period dates in same batch', 'Employee Identity', (() => {
  const e1 = emp({ employee_id: 'EMP001', metadata: { pay_period_start: '2025-01-01', pay_period_end: '2025-01-15' } });
  const e2 = emp({ employee_id: 'EMP002', metadata: { pay_period_start: '2025-01-16', pay_period_end: '2025-01-31' } });
  return ctx(e1, emp({ employee_id: 'EMP001' }), '__employee_level__', [e1, e2]);
})(), ['PAY_PERIOD_MISMATCH']);

// 21. New employee — missing baseline
test('New hire: in current run but not in baseline', 'Cross-Category', (() => {
  const newHire = emp({ employee_id: 'NEWHIRE001' });
  const existingBaseline = emp({ employee_id: 'EXISTING001' });
  return ctx(newHire, undefined, '__employee_level__', [newHire], [existingBaseline]);
})(), ['MISSING_BASELINE_ROW']);

// 22. Missing federal tax
test('$5,000 gross but federal income tax = $0', 'Taxes',
  ctx(emp({ federal_income_tax: 0, gross_pay: 5000 }), emp({ federal_income_tax: 750 }), 'federal_income_tax'),
  ['MISSING_FEDERAL_TAX']);

// 23. Missing FICA
test('$5,000 gross but SS tax = $0 and Medicare = $0', 'Taxes',
  ctx(emp({ social_security_tax: 0, medicare_tax: 0, gross_pay: 5000 }), emp({ social_security_tax: 310 }), 'social_security_tax'),
  ['MISSING_FICA_TAXES']);

// 24. State tax zero — review not blocker
test('State tax $0 on $5,000 gross — review severity (handles no-income-tax states)', 'Taxes',
  ctx(emp({ state_income_tax: 0, gross_pay: 5000 }), emp({ state_income_tax: 150 }), 'state_income_tax'),
  ['STATE_TAX_MISSING']);

// 25. Deductions exceed gross
test('Deductions ($6,000) exceed gross ($5,000)', 'Deductions',
  ctx(emp({ total_deductions: 6000, gross_pay: 5000 }), emp({ total_deductions: 500 }), 'total_deductions'),
  ['DEDUCTIONS_EXCEED_GROSS']);

// 26. Negative deduction
test('Total deductions are -$200', 'Deductions',
  ctx(emp({ total_deductions: -200 }), emp({ total_deductions: 500 }), 'total_deductions'),
  ['NEGATIVE_DEDUCTION']);

// 27. Gross not equal earnings sum
test('Gross ($5,000) ≠ base($3,000) + OT($500) + bonus($500) + other($0) = $4,000', 'Earnings',
  ctx(emp({ gross_pay: 5000, base_earnings: 3000, overtime_pay: 500, bonus_earnings: 500, other_earnings: 0 }), emp({ gross_pay: 5000, base_earnings: 5000 }), 'gross_pay'),
  ['GROSS_NOT_EQUAL_EARNINGS_SUM']);

// 28. Negative earnings
test('Base earnings are -$500', 'Earnings',
  ctx(emp({ base_earnings: -500, gross_pay: 4500 }), emp({ base_earnings: 5000 }), 'base_earnings'),
  ['EARNINGS_NEGATIVE']);

// 29. Gross pay spike >50%
test('Gross pay spiked 70%: $5,000 → $8,500', 'Fundamental Pay',
  ctx(emp({ gross_pay: 8500 }), emp({ gross_pay: 5000 }), 'gross_pay'),
  ['GROSS_PAY_SPIKE_50PCT'], ['NEGATIVE_GROSS_PAY']);

// 30. Gross pay drop >30%
test('Gross pay dropped 40%: $5,000 → $3,000', 'Fundamental Pay',
  ctx(emp({ gross_pay: 3000 }), emp({ gross_pay: 5000 }), 'gross_pay'),
  ['GROSS_PAY_DROP_30PCT']);

// 31. Tax spike >40%
test('Federal tax spiked 60%: $750 → $1,200', 'Taxes',
  ctx(emp({ federal_income_tax: 1200 }), emp({ federal_income_tax: 750 }), 'federal_income_tax'),
  ['TAX_SPIKE_40PCT']);

// 32. Tax drop >30%
test('Federal tax dropped 47%: $750 → $400', 'Taxes',
  ctx(emp({ federal_income_tax: 400 }), emp({ federal_income_tax: 750 }), 'federal_income_tax'),
  ['TAX_DROP_30PCT']);

// 33. Employment status change (part-time — not inactive, so no blocker)
test('Status changed Active → Part-Time: high-risk review, not blocker', 'Employee Identity',
  ctx(emp({ employment_status: 'Part-Time' }), emp({ employment_status: 'Active' }), '__employee_level__'),
  ['EMPLOYMENT_STATUS_CHANGE'],
  ['INACTIVE_EMPLOYEE_PAID']);

// 34a. Material hours increase — 75% increase should NOT trigger (rule requires 100%+)
test('Hours jumped 75%: 80 → 140 (MATERIAL_HOURS_INCREASE needs 100%+, should NOT fire)', 'Hours & Earnings',
  ctx(emp({ total_hours_worked: 140, regular_hours: 80, overtime_hours: 60 }), emp({ total_hours_worked: 80 }), 'total_hours_worked'),
  [],
  ['HOURS_EXCEED_MAX', 'MATERIAL_HOURS_INCREASE']);  // neither should fire

// 34b. Hours doubled: 80 → 170 — MATERIAL_HOURS_INCREASE fires at ≥ 2x
test('Hours doubled 113%: 80 → 170 in bi-weekly period — MATERIAL_HOURS_INCREASE should fire', 'Hours & Earnings',
  ctx(emp({ total_hours_worked: 170, regular_hours: 80, overtime_hours: 90 }), emp({ total_hours_worked: 80 }), 'total_hours_worked'),
  ['MATERIAL_HOURS_INCREASE'],
  ['HOURS_EXCEED_MAX']);  // 170 is within 336-hour bi-weekly max

// 35. Deduction spike >50%
test('Deductions spiked 80%: $500 → $900', 'Deductions',
  ctx(emp({ total_deductions: 900 }), emp({ total_deductions: 500 }), 'total_deductions'),
  ['DEDUCTION_SPIKE_50PCT'], ['DEDUCTIONS_EXCEED_GROSS']);

// 36. Overtime without regular hours
test('10 OT hours but zero regular hours — incomplete timesheet', 'Hours & Earnings',
  ctx(emp({ overtime_hours: 10, regular_hours: 0, total_hours_worked: 10 }), emp({ regular_hours: 80, overtime_hours: 0 }), '__employee_level__'),
  ['OVERTIME_WITHOUT_REGULAR'],
  ['ZERO_HOURS_WITH_PAY']);

// 37. Bonus paid unexpectedly
test('$2,000 bonus appears with no prior bonus history', 'Earnings',
  ctx(emp({ bonus_earnings: 2000 }), emp({ bonus_earnings: 0 }), 'bonus_earnings'),
  ['BONUS_PAID_UNEXPECTEDLY']);

// 38. FICA wage base edge — employee earning below threshold, SS tax correct
test('Normal earner with correct FICA: SS tax at 6.2% of gross', 'Taxes',
  ctx(emp({ gross_pay: 5000, social_security_tax: 310, medicare_tax: 72.5 }), emp({ gross_pay: 5000, social_security_tax: 310, medicare_tax: 72.5 }), 'social_security_tax'),
  [],
  ['MISSING_FICA_TAXES']);

// ─── Round 4: New tests for severity and false-positive fixes ─────────────────

// 39. Salaried employee with pay_type='salary' and 0 hours — ZERO_HOURS_WITH_PAY must NOT fire
test('Salaried employee (pay_type=salary) with 0 hours — valid scenario, no flag', 'Hours & Earnings',
  ctx(emp({ total_hours_worked: 0, regular_hours: 0, pay_type: 'salary', gross_pay: 5000 }), emp({ total_hours_worked: 0, pay_type: 'salary' }), '__employee_level__'),
  [],
  ['ZERO_HOURS_WITH_PAY']);

// 40. Exempt employee (flsa_classification=exempt) with 0 hours — ZERO_HOURS_WITH_PAY must NOT fire
test('Exempt employee (flsa_classification=exempt) with 0 hours — valid scenario, no flag', 'Hours & Earnings',
  ctx(emp({ total_hours_worked: 0, regular_hours: 0, flsa_classification: 'exempt', gross_pay: 5000 }), emp({ total_hours_worked: 0 }), '__employee_level__'),
  [],
  ['ZERO_HOURS_WITH_PAY']);

// 41. Hourly employee (pay_type=hourly) with 0 hours — ZERO_HOURS_WITH_PAY MUST fire
test('Hourly employee (pay_type=hourly) with 0 hours and pay — data error, must flag', 'Hours & Earnings',
  ctx(emp({ total_hours_worked: 0, regular_hours: 0, pay_type: 'hourly', gross_pay: 5000 }), emp({ total_hours_worked: 80 }), '__employee_level__'),
  ['ZERO_HOURS_WITH_PAY']);

// 42. GROSS_LESS_THAN_NET now a blocker — verify it fires correctly
test('Gross ($3,000) < Net ($3,200) — must flag as blocker domain error', 'Fundamental Pay',
  ctx(emp({ gross_pay: 3000, net_pay: 3200, total_deductions: 0, federal_income_tax: 0, social_security_tax: 0, medicare_tax: 0 }), emp(), '__employee_level__'),
  ['GROSS_LESS_THAN_NET']);

// 43. PAY_DATE_IN_PAST downgraded to info — normal calendar scenario should not drive verdict
test('Pay date before period end — standard semi-monthly schedule, info only (not review)', 'Employee Identity',
  ctx(emp({ metadata: { pay_date: '2025-01-15', pay_period_end: '2025-01-31' } }), emp(), '__employee_level__'),
  ['PAY_DATE_IN_PAST']);

// 44. 401K annualized limit check: bi-weekly contribution of $1,000/period = $26,000/yr > $23,500 IRS limit
test('401K contribution $1,000/bi-weekly (= $26,000 annualized) exceeds $23,500 IRS limit', 'Deductions',
  ctx(emp({ pay_frequency: 'bi-weekly', pay_components: [{ component_name: '401k', amount: 1000 }] }), emp(), '__employee_level__'),
  ['401K_OVER_IRS_LIMIT']);

// 45. 401K annualized limit check: bi-weekly contribution of $800/period = $20,800/yr — within limit
test('401K contribution $800/bi-weekly (= $20,800 annualized) within $23,500 IRS limit — no flag', 'Deductions',
  ctx(emp({ pay_frequency: 'bi-weekly', pay_components: [{ component_name: '401k', amount: 800 }] }), emp(), '__employee_level__'),
  [],
  ['401K_OVER_IRS_LIMIT']);

// ─── Output ───────────────────────────────────────────────────────────────────

const passed = results.filter(r => r.pass).length;
const failed = results.filter(r => !r.pass).length;

console.log('\n' + '═'.repeat(80));
console.log('  PAYROLLSHIELD — PAYROLL SME RULE VALIDATION TEST SUITE');
console.log('═'.repeat(80));
console.log(`  Total: ${results.length}  |  Passed: ${passed}  |  Failed: ${failed}  |  Pass rate: ${((passed/results.length)*100).toFixed(1)}%`);
console.log('═'.repeat(80) + '\n');

for (const r of results) {
  const icon = r.pass ? '✅' : '❌';
  const fired = r.firedIds.length ? r.firedIds.join(', ') : '(none)';
  console.log(`${icon} [${String(r.id).padStart(2, '0')}] ${r.category} — ${r.scenario}`);
  if (!r.pass) {
    console.log(`      FAIL: ${r.details}`);
    console.log(`      All fired: ${fired}`);
  } else if (r.expectedToFire.length > 0) {
    console.log(`      Fired: ${fired}`);
  }
}

console.log('\n' + '═'.repeat(80));
if (failed === 0) {
  console.log('  ALL TESTS PASSED — Rules engine behaves correctly for all SME scenarios.');
} else {
  console.log(`  ${failed} TEST(S) FAILED — Review above failures.`);
  process.exit(1);
}
console.log('═'.repeat(80) + '\n');
