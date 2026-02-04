import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Sparkles, ShieldX, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import type { EnrichedJudgement } from '../../lib/types/review';

interface JudgementCardProps {
  item: EnrichedJudgement;
}

const METRIC_LABELS: Record<string, string> = {
  net_pay: 'Net Pay',
  gross_pay: 'Gross Pay',
  total_deductions: 'Deductions',
  component: 'Component',
  regular_hours: 'Regular Hours',
  overtime_hours: 'Overtime Hours',
  other_paid_hours: 'Other Paid Hours',
  total_hours_worked: 'Total Hours',
  base_earnings: 'Base Earnings',
  overtime_pay: 'Overtime Pay',
  bonus_earnings: 'Bonus Earnings',
  other_earnings: 'Other Earnings',
  federal_income_tax: 'Federal Tax',
  social_security_tax: 'Social Security',
  medicare_tax: 'Medicare',
  state_income_tax: 'State Tax',
  local_tax: 'Local Tax',
};

function formatMetricLabel(metric: string): string {
  return METRIC_LABELS[metric] || metric.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function formatValue(value: number | null, metric: string): string {
  if (value === null) return 'N/A';
  if (metric.includes('hours')) {
    return value.toFixed(1);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function formatDelta(delta: number | null): string {
  if (delta === null) return 'N/A';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}%`;
}

function getDeltaColor(delta: number | null): string {
  if (delta === null) return 'text-gray-600';
  if (delta > 0) return 'text-green-700';
  if (delta < 0) return 'text-red-700';
  return 'text-gray-600';
}

function getSeverityConfig(severity: string) {
  switch (severity) {
    case 'blocker':
      return {
        border: 'border-l-red-500',
        badgeBg: 'bg-red-100 text-red-800 border-red-200',
        label: 'BLOCKER',
        icon: ShieldX,
        headerBg: 'bg-red-50',
      };
    case 'review':
      return {
        border: 'border-l-amber-400',
        badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
        label: 'REVIEW',
        icon: AlertTriangle,
        headerBg: 'bg-amber-50',
      };
    default:
      return {
        border: 'border-l-gray-300',
        badgeBg: 'bg-gray-100 text-gray-700 border-gray-200',
        label: 'INFO',
        icon: Info,
        headerBg: 'bg-gray-50',
      };
  }
}

function getConfidenceBadge(level: string): { className: string; label: string } {
  switch (level) {
    case 'VERY_HIGH':
      return { className: 'bg-red-50 text-red-700 border-red-200', label: 'Very High' };
    case 'HIGH':
      return { className: 'bg-amber-50 text-amber-700 border-amber-200', label: 'High' };
    case 'MODERATE':
      return { className: 'bg-gray-50 text-gray-600 border-gray-200', label: 'Moderate' };
    default:
      return { className: 'bg-gray-50 text-gray-600 border-gray-200', label: level };
  }
}

export function JudgementCard({ item }: JudgementCardProps) {
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const severity = getSeverityConfig(item.rule_severity);
  const confidence = getConfidenceBadge(item.confidence_level);
  const SeverityIcon = severity.icon;

  const fetchAiExplanation = async () => {
    if (aiExplanation) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: item.employee_id,
          metric: item.metric,
          component_name: item.component_name,
          baseline_value: item.baseline_value,
          current_value: item.current_value,
          delta_absolute: item.delta_absolute,
          delta_percentage: item.delta_percentage,
          change_type: item.change_type,
          rule_id: item.rule_id,
          reasoning: item.reasoning,
          is_blocker: item.is_blocker,
        }),
      });
      const data = await res.json();
      setAiExplanation(data.explanation || 'Unable to generate explanation.');
    } catch {
      setAiExplanation('Failed to load explanation. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const metricLabel = formatMetricLabel(item.metric);
  const hasSnapshot = item.baseline_value !== null || item.current_value !== null;

  return (
    <Card className={`border-l-4 ${severity.border} overflow-hidden`}>
      {/* Header */}
      <div className={`${severity.headerBg} px-4 py-3 flex items-center justify-between flex-wrap gap-2`}>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-xs font-bold ${severity.badgeBg}`}>
            <SeverityIcon className="h-3 w-3 mr-1" />
            {severity.label}
          </Badge>
          <span className="text-sm font-semibold text-gray-900">{item.rule_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs bg-white/80 text-gray-700 px-2 py-0.5 rounded border border-gray-200">
            {item.employee_id}
          </span>
          <Badge variant="outline" className={`text-xs ${confidence.className}`}>
            {confidence.label} confidence
          </Badge>
        </div>
      </div>

      <CardContent className="pt-4 pb-4 space-y-4">
        {/* Snapshot Table */}
        {hasSnapshot && (
          <div className="rounded-md border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Metric</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Previous</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Current</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-3 py-2 font-medium text-gray-900">{metricLabel}</td>
                  <td className="px-3 py-2 text-right text-gray-600 font-mono text-xs">
                    {formatValue(item.baseline_value, item.metric)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-900 font-mono text-xs font-semibold">
                    {formatValue(item.current_value, item.metric)}
                  </td>
                  <td className={`px-3 py-2 text-right font-mono text-xs font-semibold ${getDeltaColor(item.delta_percentage)}`}>
                    {formatDelta(item.delta_percentage)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* System Assessment */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">System Assessment</h4>
          <p className="text-sm text-gray-800 font-medium">{item.flag_reason}</p>
        </div>

        {/* Why we flagged this */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Why we flagged this</h4>
          <p className="text-sm text-gray-700">{item.risk_statement}</p>
        </div>

        {/* What usually causes this */}
        {item.common_causes.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">What usually causes this</h4>
            <ul className="text-sm text-gray-700 space-y-0.5">
              {item.common_causes.map((cause, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-gray-400 mt-0.5 shrink-0">&bull;</span>
                  <span>{cause}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* What to check first */}
        {item.review_steps.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">What to check first</h4>
            <ol className="text-sm text-gray-700 space-y-0.5">
              {item.review_steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-gray-400 font-mono text-xs mt-0.5 shrink-0 w-4 text-right">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* AI Explanation */}
        <div className="pt-2 border-t border-gray-100">
          {aiExplanation ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-xs font-semibold text-blue-700">AI Explanation</span>
              </div>
              <p className="text-sm text-blue-900 leading-relaxed">{aiExplanation}</p>
            </div>
          ) : (
            <button
              onClick={fetchAiExplanation}
              disabled={aiLoading}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {aiLoading ? 'Generating explanation...' : 'Explain with AI'}
            </button>
          )}
        </div>

        {/* Rule ID footer */}
        <div className="flex justify-end">
          <span className="text-[10px] text-gray-300 font-mono">{item.rule_id}</span>
        </div>
      </CardContent>
    </Card>
  );
}
