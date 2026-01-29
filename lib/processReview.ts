import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

interface Delta {
  review_session_id: string;
  organization_id: string;
  employee_id: string;
  metric: string;
  change_type: string;
  baseline_value: number | null;
  current_value: number | null;
  delta_absolute: number | null;
  delta_percentage: number | null;
  delta_id?: string;
}

interface Judgement {
  is_material: boolean;
  is_blocker: boolean;
  confidence_score: number;
  reasoning: string;
  rule_id: string;
}

// 12 Deterministic Rules
function applyRules(delta: Delta): Judgement {
  const m = delta.metric;
  const c = delta.change_type;
  const b = delta.baseline_value;
  const v = delta.current_value;
  const p = delta.delta_percentage;

  // R001: BLOCKER - Negative net pay
  if (m === 'net_pay' && v !== null && v < 0) {
    return {
      is_material: true,
      is_blocker: true,
      confidence_score: 1.0,
      reasoning: `Net pay is negative (${v.toFixed(2)}). Immediate correction required.`,
      rule_id: 'R001_NEGATIVE_NET_PAY'
    };
  }

  // R002: BLOCKER - Net pay decrease > 20%
  if (m === 'net_pay' && c === 'decrease' && p !== null && p < -20) {
    return {
      is_material: true,
      is_blocker: true,
      confidence_score: 0.95,
      reasoning: `Net pay decreased by ${Math.abs(p).toFixed(1)}%. Verify accuracy.`,
      rule_id: 'R002_NET_PAY_DECREASE_20PCT'
    };
  }

  // R003: MATERIAL - Net pay increase > 50%
  if (m === 'net_pay' && c === 'increase' && p !== null && p > 50) {
    return {
      is_material: true,
      is_blocker: false,
      confidence_score: 0.9,
      reasoning: `Net pay increased by ${p.toFixed(1)}%. Confirm reason (promotion, bonus, etc.).`,
      rule_id: 'R003_NET_PAY_INCREASE_50PCT'
    };
  }

  // R004: MATERIAL - Removed employee
  if (c === 'removed_employee') {
    return {
      is_material: true,
      is_blocker: false,
      confidence_score: 1.0,
      reasoning: `Employee removed from payroll. Confirm termination or LOA.`,
      rule_id: 'R004_REMOVED_EMPLOYEE'
    };
  }

  // R005: MATERIAL - New employee
  if (c === 'new_employee') {
    return {
      is_material: true,
      is_blocker: false,
      confidence_score: 1.0,
      reasoning: `New employee added to payroll. Verify hire paperwork.`,
      rule_id: 'R005_NEW_EMPLOYEE'
    };
  }

  // R006: MATERIAL - Gross pay decrease > 15%
  if (m === 'gross_pay' && c === 'decrease' && p !== null && p < -15) {
    return {
      is_material: true,
      is_blocker: false,
      confidence_score: 0.85,
      reasoning: `Gross pay decreased by ${Math.abs(p).toFixed(1)}%. Review hours or salary change.`,
      rule_id: 'R006_GROSS_PAY_DECREASE_15PCT'
    };
  }

  // R007: MATERIAL - Gross pay increase > 50%
  if (m === 'gross_pay' && c === 'increase' && p !== null && p > 50) {
    return {
      is_material: true,
      is_blocker: false,
      confidence_score: 0.85,
      reasoning: `Gross pay increased by ${p.toFixed(1)}%. Verify overtime or bonus.`,
      rule_id: 'R007_GROSS_PAY_INCREASE_50PCT'
    };
  }

  // R008: MATERIAL - Deduction increase > 100%
  if (m === 'total_deductions' && c === 'increase' && p !== null && p > 100) {
    return {
      is_material: true,
      is_blocker: false,
      confidence_score: 0.8,
      reasoning: `Deductions increased by ${p.toFixed(1)}%. Review benefit changes or garnishments.`,
      rule_id: 'R008_DEDUCTION_INCREASE_100PCT'
    };
  }

  // R010: NON-MATERIAL - Minor net pay change < 5%
  if (m === 'net_pay' && p !== null && Math.abs(p) < 5) {
    return {
      is_material: false,
      is_blocker: false,
      confidence_score: 0.95,
      reasoning: `Minor net pay change (${p.toFixed(1)}%). Likely rounding or minor adjustment.`,
      rule_id: 'R010_MINOR_CHANGE'
    };
  }

  // R099: DEFAULT - Material change
  if (m === 'net_pay' || m === 'gross_pay') {
    return {
      is_material: true,
      is_blocker: false,
      confidence_score: 0.7,
      reasoning: `${m} changed by ${p ? p.toFixed(1) + '%' : 'unknown amount'}. Review for accuracy.`,
      rule_id: 'R099_DEFAULT_MATERIAL'
    };
  }

  // R000: NO RULE MATCH
  return {
    is_material: false,
    is_blocker: false,
    confidence_score: 0.5,
    reasoning: `Change detected but no specific rule matched.`,
    rule_id: 'R000_NO_MATCH'
  };
}

export async function processReview(reviewSessionId: string) {
  console.log(`[ProcessReview] Starting processing for session: ${reviewSessionId}`);

  try {
    // Step 1: Get datasets
    const { data: datasets, error: dsError } = await supabase
      .from('payroll_dataset')
      .select('*')
      .eq('review_session_id', reviewSessionId);

    if (dsError) throw new Error(`Failed to fetch datasets: ${dsError.message}`);
    if (!datasets || datasets.length !== 2) {
      throw new Error(`Expected 2 datasets, found ${datasets?.length || 0}`);
    }

    const baseline = datasets.find(d => d.dataset_type === 'baseline');
    const current = datasets.find(d => d.dataset_type === 'current');
    const orgId = baseline.organization_id;

    // Step 2: Get employee records
    const { data: baselineEmployees } = await supabase
      .from('employee_pay_record')
      .select('*')
      .eq('dataset_id', baseline.dataset_id);

    const { data: currentEmployees } = await supabase
      .from('employee_pay_record')
      .select('*')
      .eq('dataset_id', current.dataset_id);

    // Step 3: Calculate deltas
    const baselineMap = new Map(baselineEmployees?.map(e => [e.employee_id, e]) || []);
    const currentMap = new Map(currentEmployees?.map(e => [e.employee_id, e]) || []);
    const deltas: Delta[] = [];

    // Removed employees
    for (const [employeeId, baselineEmp] of baselineMap) {
      if (!currentMap.has(employeeId)) {
        deltas.push({
          review_session_id: reviewSessionId,
          organization_id: orgId,
          employee_id: employeeId,
          metric: 'net_pay',
          change_type: 'removed_employee',
          baseline_value: baselineEmp.net_pay,
          current_value: null,
          delta_absolute: null,
          delta_percentage: null
        });
      }
    }

    // New employees and changes
    for (const [employeeId, currentEmp] of currentMap) {
      const baselineEmp = baselineMap.get(employeeId);

      if (!baselineEmp) {
        // New employee
        deltas.push({
          review_session_id: reviewSessionId,
          organization_id: orgId,
          employee_id: employeeId,
          metric: 'net_pay',
          change_type: 'new_employee',
          baseline_value: null,
          current_value: currentEmp.net_pay,
          delta_absolute: null,
          delta_percentage: null
        });
      } else {
        // Check changes
        ['net_pay', 'gross_pay', 'total_deductions'].forEach(metric => {
          const bVal = baselineEmp[metric];
          const cVal = currentEmp[metric];

          if (bVal !== cVal) {
            const deltaAbs = cVal - bVal;
            const deltaPct = bVal !== 0 ? (deltaAbs / bVal) * 100 : null;

            deltas.push({
              review_session_id: reviewSessionId,
              organization_id: orgId,
              employee_id: employeeId,
              metric: metric,
              change_type: deltaAbs > 0 ? 'increase' : 'decrease',
              baseline_value: bVal,
              current_value: cVal,
              delta_absolute: deltaAbs,
              delta_percentage: deltaPct
            });
          }
        });
      }
    }

    console.log(`[ProcessReview] Calculated ${deltas.length} deltas`);

    // Step 4: Insert deltas
    const { data: insertedDeltas, error: deltaError } = await supabase
      .from('payroll_delta')
      .insert(deltas)
      .select();

    if (deltaError) throw new Error(`Failed to insert deltas: ${deltaError.message}`);

    // Step 5: Apply judgement rules
    const judgements = insertedDeltas?.map(delta => {
      const judgement = applyRules(delta);
      return {
        delta_id: delta.delta_id,
        is_material: judgement.is_material,
        is_blocker: judgement.is_blocker,
        confidence_score: judgement.confidence_score,
        reasoning: judgement.reasoning,
        rule_id: judgement.rule_id
      };
    });

    const materialCount = judgements?.filter(j => j.is_material).length || 0;
    const blockerCount = judgements?.filter(j => j.is_blocker).length || 0;

    // Step 6: Insert judgements
    const { error: judgementError } = await supabase
      .from('material_judgement')
      .insert(judgements);

    if (judgementError) throw new Error(`Failed to insert judgements: ${judgementError.message}`);

    console.log(`[ProcessReview] Complete: ${deltas.length} deltas, ${materialCount} material, ${blockerCount} blockers`);

    return {
      success: true,
      delta_count: deltas.length,
      material_count: materialCount,
      blocker_count: blockerCount
    };

  } catch (error: any) {
    console.error(`[ProcessReview] Error:`, error.message);
    throw error;
  }
}
