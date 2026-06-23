import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { ShieldX, AlertTriangle, Info, StickyNote } from 'lucide-react';
import { supabase } from '../../lib/supabase';
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
  const [notes, setNotes] = useState(item.reviewer_notes || '');
  const [showNotes, setShowNotes] = useState(!!item.reviewer_notes);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'pending' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveNotes = useCallback(async (value: string) => {
    setSaveStatus('saving');
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const res = await fetch('/api/judgement-notes', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(authSession?.access_token ? { Authorization: `Bearer ${authSession.access_token}` } : {}),
        },
        body: JSON.stringify({ judgement_id: item.judgement_id, notes: value }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  }, [item.judgement_id]);

  const handleNotesChange = (value: string) => {
    setNotes(value);
    setSaveStatus('pending');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveNotes(value), 1000);
  };

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const severity = getSeverityConfig(item.rule_severity);
  const confidence = getConfidenceBadge(item.confidence_level);
  const SeverityIcon = severity.icon;

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

      <CardContent className="pt-4 pb-4 space-y-3">
        {/* Line 1: What Changed */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            1. What Changed
          </h4>
          <div className="text-sm text-gray-900">
            {hasSnapshot ? (
              <div className="space-y-1">
                <div className="font-semibold">
                  {metricLabel}{' '}
                  {item.delta_percentage !== null && (
                    <span className={`${getDeltaColor(item.delta_percentage)}`}>
                      {item.delta_percentage > 0 ? 'increased' : 'decreased'} by {Math.abs(item.delta_percentage).toFixed(1)}%
                    </span>
                  )}
                  {item.delta_absolute !== null && (
                    <span className={`${getDeltaColor(item.delta_percentage)}`}>
                      {' '}({item.delta_absolute > 0 ? '+' : ''}{formatValue(item.delta_absolute, item.metric)})
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-600 font-mono">
                  Previous: {formatValue(item.baseline_value, item.metric)} → Current: {formatValue(item.current_value, item.metric)}
                </div>
              </div>
            ) : (
              <span className="font-semibold">{item.rule_name}</span>
            )}
          </div>
        </div>

        {/* Line 2: Why You're Seeing This */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            2. Why You're Seeing This
          </h4>
          <p className="text-sm text-gray-800">
            {item.triggered_condition || item.flag_reason}
          </p>
        </div>

        {/* Line 3: Why This Is Risky */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            3. Why This Is Risky
          </h4>
          <p className="text-sm text-gray-800">
            {item.why_this_matters || item.risk_statement}
          </p>
        </div>

        {/* Line 4: What To Do */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            4. What To Do
          </h4>
          <p className="text-sm text-gray-800 font-medium">
            {item.reviewer_action || (item.review_steps.length > 0 ? item.review_steps.join('; ') : item.user_action)}
          </p>
        </div>

        {/* Common Causes (expandable) */}
        {item.common_causes.length > 0 && (
          <details className="text-xs text-gray-600">
            <summary className="cursor-pointer font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700">
              What usually causes this
            </summary>
            <ul className="mt-2 text-sm text-gray-700 space-y-0.5 pl-4">
              {item.common_causes.map((cause, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-gray-400 mt-0.5 shrink-0">&bull;</span>
                  <span>{cause}</span>
                </li>
              ))}
            </ul>
          </details>
        )}

        {/* Notes row */}
        <div className="pt-2 border-t border-gray-100 space-y-3">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <StickyNote className="h-3.5 w-3.5" />
            {notes ? 'Edit notes' : 'Add notes'}
            {notes && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
          </button>

          {/* Notes textarea */}
          {showNotes && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Reviewer Notes
                </label>
              </div>
              <textarea
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Document actions taken, findings, or follow-up items..."
                className="w-full text-sm text-gray-800 bg-white border border-gray-200 rounded-md px-3 py-2 min-h-[72px] resize-y focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
              />
              <div className="mt-1 h-4">
                {saveStatus === 'pending' && (
                  <span className="text-[11px] text-gray-400">Unsaved changes…</span>
                )}
                {saveStatus === 'saving' && (
                  <span className="text-[11px] text-gray-400">Saving…</span>
                )}
                {saveStatus === 'saved' && (
                  <span className="text-[11px] text-green-600">Saved ✓</span>
                )}
                {saveStatus === 'error' && (
                  <span className="text-[11px] text-red-500">Save failed — try again</span>
                )}
              </div>
            </div>
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
