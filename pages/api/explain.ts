import { NextApiRequest, NextApiResponse } from 'next';

/**
 * POST /api/explain
 * Generate an AI explanation for a payroll change.
 *
 * Currently returns mock explanations based on the delta data.
 * TODO: Replace mock logic with OpenAI GPT-4o-mini call when API key is configured.
 *
 * Body:
 *   - employee_id: string
 *   - metric: string (net_pay, gross_pay, total_deductions, component)
 *   - component_name?: string
 *   - baseline_value: number | null
 *   - current_value: number | null
 *   - delta_absolute: number | null
 *   - delta_percentage: number | null
 *   - change_type: string
 *   - rule_id?: string
 *   - reasoning?: string
 *   - is_blocker?: boolean
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      employee_id,
      metric,
      component_name,
      baseline_value,
      current_value,
      delta_absolute,
      delta_percentage,
      change_type,
      rule_id,
      reasoning,
      is_blocker,
    } = req.body;

    if (!employee_id || !metric) {
      return res.status(400).json({ error: 'employee_id and metric are required' });
    }

    // -----------------------------------------------------------
    // TODO: Replace this mock generator with an OpenAI API call.
    //
    // Example future implementation:
    //
    //   const { OpenAI } = require('openai');
    //   const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    //
    //   const completion = await openai.chat.completions.create({
    //     model: 'gpt-4o-mini',
    //     messages: [
    //       {
    //         role: 'system',
    //         content: 'You are a payroll analyst assistant. Explain payroll changes in clear, plain language that a non-technical payroll manager can understand. Be concise (2-3 sentences). Focus on what changed, the likely cause, and what action the reviewer should take.',
    //       },
    //       {
    //         role: 'user',
    //         content: `Explain this payroll change:\n- Employee: ${employee_id}\n- Metric: ${metric}\n- Previous: ${baseline_value}\n- Current: ${current_value}\n- Change: ${delta_percentage}%\n- Rule triggered: ${rule_id}\n- Rule reasoning: ${reasoning}`,
    //       },
    //     ],
    //     max_tokens: 150,
    //     temperature: 0.3,
    //   });
    //
    //   const explanation = completion.choices[0].message.content;
    //
    // -----------------------------------------------------------

    const explanation = generateMockExplanation({
      employee_id,
      metric,
      component_name,
      baseline_value,
      current_value,
      delta_absolute,
      delta_percentage,
      change_type,
      rule_id,
      is_blocker,
    });

    return res.status(200).json({ explanation });
  } catch (error: any) {
    console.error('Explain API error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate explanation' });
  }
}

interface DeltaInput {
  employee_id: string;
  metric: string;
  component_name?: string;
  baseline_value: number | null;
  current_value: number | null;
  delta_absolute: number | null;
  delta_percentage: number | null;
  change_type: string;
  rule_id?: string;
  is_blocker?: boolean;
}

function formatCurrency(value: number | null): string {
  if (value === null) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function formatMetric(metric: string, componentName?: string): string {
  if (metric === 'component' && componentName) return componentName;
  return metric.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function generateMockExplanation(delta: DeltaInput): string {
  const metricLabel = formatMetric(delta.metric, delta.component_name);
  const pct = delta.delta_percentage !== null ? Math.abs(delta.delta_percentage).toFixed(1) : null;
  const absChange = formatCurrency(delta.delta_absolute !== null ? Math.abs(delta.delta_absolute) : null);

  // Blocker explanations
  if (delta.is_blocker) {
    if (delta.rule_id === 'R001_NEGATIVE_NET_PAY') {
      return `Employee #${delta.employee_id}'s net pay has dropped to ${formatCurrency(delta.current_value)}, which is negative. This typically happens when deductions (taxes, benefits, garnishments) exceed gross earnings. Payroll cannot be processed with a negative net pay — verify that all deduction amounts are correct and that the employee's hours or salary haven't been entered incorrectly. This must be corrected before approval.`;
    }
    return `Employee #${delta.employee_id}'s ${metricLabel.toLowerCase()} changed from ${formatCurrency(delta.baseline_value)} to ${formatCurrency(delta.current_value)} (${pct ? pct + '% change' : 'significant change'}). This has been flagged as a blocker because it represents a critical issue that could lead to payroll processing errors, compliance violations, or incorrect employee compensation. Review the underlying data, confirm the change is intentional, and resolve the issue before approving this payroll run.`;
  }

  // Change-type-specific explanations
  if (delta.change_type === 'new_employee') {
    return `Employee #${delta.employee_id} is a new addition to this payroll run with a ${metricLabel.toLowerCase()} of ${formatCurrency(delta.current_value)}. New employees should be cross-checked against HR onboarding records to confirm their pay rate, tax withholdings, and benefit elections are set up correctly. Verify their start date falls within this pay period.`;
  }

  if (delta.change_type === 'removed_employee') {
    return `Employee #${delta.employee_id} was present in the previous payroll but is no longer in the current run. This could indicate a termination, leave of absence, or a data entry issue. Confirm with HR whether this employee should have been removed, and verify that any final pay, PTO payout, or severance has been handled separately if applicable.`;
  }

  // Metric-specific explanations
  if (delta.metric === 'net_pay') {
    if (delta.change_type === 'decrease') {
      return `Employee #${delta.employee_id}'s net pay decreased by ${absChange} (${pct}%), from ${formatCurrency(delta.baseline_value)} to ${formatCurrency(delta.current_value)}. Common causes include increased tax withholdings, new benefit deductions, reduced hours, or a pay rate adjustment. Check whether any deductions were added or modified since the last pay period, and confirm the employee's hours are recorded accurately.`;
    }
    return `Employee #${delta.employee_id}'s net pay increased by ${absChange} (${pct}%), from ${formatCurrency(delta.baseline_value)} to ${formatCurrency(delta.current_value)}. This could result from a raise, bonus, overtime hours, or a reduction in deductions. Verify that any pay increases were authorized and that overtime hours, if applicable, match timesheet records.`;
  }

  if (delta.metric === 'gross_pay') {
    return `Employee #${delta.employee_id}'s gross pay ${delta.change_type === 'decrease' ? 'decreased' : 'increased'} by ${absChange} (${pct}%), moving from ${formatCurrency(delta.baseline_value)} to ${formatCurrency(delta.current_value)}. Gross pay changes are typically driven by hours worked, overtime, pay rate changes, or one-time payments like bonuses. Cross-reference with timesheets and any approved pay adjustments to confirm this change is expected.`;
  }

  if (delta.metric === 'total_deductions') {
    return `Employee #${delta.employee_id}'s total deductions ${delta.change_type === 'decrease' ? 'decreased' : 'increased'} by ${absChange} (${pct}%), from ${formatCurrency(delta.baseline_value)} to ${formatCurrency(delta.current_value)}. Changes in deductions can stem from updated benefits elections, tax filing changes (e.g., new W-4), garnishment orders, or retirement contribution adjustments. Verify that any new or modified deductions were properly authorized.`;
  }

  // Component-level changes
  if (delta.metric === 'component') {
    return `The ${delta.component_name || 'pay component'} for Employee #${delta.employee_id} ${delta.change_type === 'decrease' ? 'decreased' : 'increased'} by ${absChange} (${pct}%), from ${formatCurrency(delta.baseline_value)} to ${formatCurrency(delta.current_value)}. Review this specific component against the employee's compensation records to confirm the change is intentional and correctly calculated.`;
  }

  // Generic fallback
  return `Employee #${delta.employee_id}'s ${metricLabel.toLowerCase()} changed from ${formatCurrency(delta.baseline_value)} to ${formatCurrency(delta.current_value)}${pct ? ` (${delta.change_type === 'decrease' ? '-' : '+'}${pct}%)` : ''}. Review this change against the employee's records and any recent HR actions to confirm it is expected and correctly applied.`;
}
