// lib/payroll/diff.ts
//
// Calculates field-by-field deltas between baseline and current employee records.
//
// This is purely deterministic math — no AI, no rules, no DB calls.
// Input:  two arrays of employee records
// Output: flat list of per-employee, per-metric changes

import { CANONICAL_NUMERIC_FIELDS } from '../canonicalSchema';

// Every numeric field tracked for delta calculation (e.g. net_pay, gross_pay, federal_income_tax, ...)
const DELTA_METRICS = CANONICAL_NUMERIC_FIELDS.map(f => f.dbColumn!).filter(Boolean);

export interface PayrollDelta {
  review_session_id: string;
  organization_id: string;
  employee_id: string;
  metric: string;
  change_type: 'increase' | 'decrease' | 'no_change' | 'new_employee' | 'removed_employee';
  baseline_value: number | null;
  current_value: number | null;
  delta_absolute: number | null;
  delta_percentage: number | null;
}

// Reads a numeric field from a DB record.
// Checks the dedicated column first, then falls back to metadata JSONB.
function getFieldValue(record: any, field: string): number | null {
  if (record[field] != null) {
    const val = Number(record[field]);
    return isNaN(val) ? null : val;
  }
  if (record.metadata?.[field] != null) {
    const val = Number(record.metadata[field]);
    return isNaN(val) ? null : val;
  }
  return null;
}

export function calculateDeltas(
  reviewSessionId: string,
  organizationId: string,
  baselineEmployees: any[],
  currentEmployees: any[],
): PayrollDelta[] {
  const deltas: PayrollDelta[] = [];

  const baselineMap = new Map(baselineEmployees.map(e => [e.employee_id, e]));
  const currentMap = new Map(currentEmployees.map(e => [e.employee_id, e]));

  // 1. Removed employees — in baseline but not in current
  for (const [employeeId, baselineEmp] of baselineMap) {
    if (!currentMap.has(employeeId)) {
      deltas.push({
        review_session_id: reviewSessionId,
        organization_id: organizationId,
        employee_id: employeeId,
        metric: 'net_pay',
        change_type: 'removed_employee',
        baseline_value: getFieldValue(baselineEmp, 'net_pay'),
        current_value: null,
        delta_absolute: null,
        delta_percentage: null,
      });
    }
  }

  // 2. New employees and metric-level changes for existing employees
  for (const [employeeId, currentEmp] of currentMap) {
    const baselineEmp = baselineMap.get(employeeId);

    if (!baselineEmp) {
      // Brand new employee this period
      deltas.push({
        review_session_id: reviewSessionId,
        organization_id: organizationId,
        employee_id: employeeId,
        metric: 'net_pay',
        change_type: 'new_employee',
        baseline_value: null,
        current_value: getFieldValue(currentEmp, 'net_pay'),
        delta_absolute: null,
        delta_percentage: null,
      });
    } else {
      // Existing employee — compare every numeric field
      let hasAnyChange = false;

      for (const metric of DELTA_METRICS) {
        const bVal = getFieldValue(baselineEmp, metric);
        const cVal = getFieldValue(currentEmp, metric);

        if (bVal == null && cVal == null) continue;

        const bNum = bVal ?? 0;
        const cNum = cVal ?? 0;

        if (bNum !== cNum) {
          const deltaAbs = cNum - bNum;
          // NUMERIC(10,2) DB column — cap at ±99999999.99 to avoid overflow
          let deltaPct = bNum !== 0 ? (deltaAbs / Math.abs(bNum)) * 100 : null;
          if (deltaPct !== null) {
            deltaPct = Math.max(-99999999.99, Math.min(99999999.99, Math.round(deltaPct * 100) / 100));
          }

          deltas.push({
            review_session_id: reviewSessionId,
            organization_id: organizationId,
            employee_id: employeeId,
            metric,
            change_type: deltaAbs > 0 ? 'increase' : 'decrease',
            baseline_value: bNum,
            current_value: cNum,
            delta_absolute: deltaAbs,
            delta_percentage: deltaPct,
          });
          hasAnyChange = true;
        }
      }

      // No changes found — still create a no_change delta so employee-level
      // rules (e.g. duplicate ID check) can attach judgements to this employee
      if (!hasAnyChange) {
        deltas.push({
          review_session_id: reviewSessionId,
          organization_id: organizationId,
          employee_id: employeeId,
          metric: 'net_pay',
          change_type: 'no_change',
          baseline_value: getFieldValue(baselineEmp, 'net_pay') ?? 0,
          current_value: getFieldValue(currentEmp, 'net_pay') ?? 0,
          delta_absolute: 0,
          delta_percentage: 0,
        });
      }
    }
  }

  return deltas;
}
