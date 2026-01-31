import React, { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Sparkles } from 'lucide-react';

interface BlockerAlertProps {
  blocker: {
    employee_id: string;
    metric: string;
    component_name?: string;
    baseline_value: number | null;
    current_value: number | null;
    delta_absolute?: number | null;
    delta_percentage: number | null;
    change_type?: string;
    material_judgement: {
      reasoning: string;
      rule_id: string;
    } | null;
  };
}

export function BlockerAlert({ blocker }: BlockerAlertProps) {
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const formatCurrency = (value: number | null) => {
    if (value === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatMetric = (metric: string) => {
    return metric
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const fetchAiExplanation = async () => {
    if (aiExplanation) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: blocker.employee_id,
          metric: blocker.metric,
          component_name: blocker.component_name,
          baseline_value: blocker.baseline_value,
          current_value: blocker.current_value,
          delta_absolute: blocker.delta_absolute ?? null,
          delta_percentage: blocker.delta_percentage,
          change_type: blocker.change_type ?? 'decrease',
          rule_id: blocker.material_judgement?.rule_id,
          reasoning: blocker.material_judgement?.reasoning,
          is_blocker: true,
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

  return (
    <Alert variant="destructive" className="mb-4 border-l-4 border-l-red-600">
      <AlertTitle className="flex items-center gap-2 text-lg font-bold">
        <span className="text-2xl">🚫</span>
        BLOCKER: Employee #{blocker.employee_id}
      </AlertTitle>
      <AlertDescription>
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-semibold text-red-900">Issue:</span>
              <p className="text-red-800">{formatMetric(blocker.metric)}</p>
            </div>
            <div>
              <span className="font-semibold text-red-900">Rule:</span>
              <p className="text-red-800 text-xs font-mono">
                {blocker.material_judgement?.rule_id || 'N/A'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-semibold text-red-900">Baseline:</span>
              <p className="text-red-800">{formatCurrency(blocker.baseline_value)}</p>
            </div>
            <div>
              <span className="font-semibold text-red-900">Current:</span>
              <p className="text-red-800 font-bold text-lg">
                {formatCurrency(blocker.current_value)}
              </p>
            </div>
          </div>

          {blocker.delta_percentage !== null && (
            <div>
              <span className="font-semibold text-red-900">Change:</span>
              <p className="text-red-800 font-bold">
                {blocker.delta_percentage > 0 ? '+' : ''}
                {blocker.delta_percentage.toFixed(1)}%
              </p>
            </div>
          )}

          <div className="mt-4 p-3 bg-red-50 rounded border border-red-200">
            <p className="text-sm text-red-900">
              <strong>Why this matters:</strong>{' '}
              {blocker.material_judgement?.reasoning || 'No reasoning provided'}
            </p>
          </div>

          {/* AI Explanation */}
          <div className="mt-1">
            {aiExplanation ? (
              <div className="bg-white/80 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-700">AI Explanation</span>
                </div>
                <p className="text-sm text-gray-800 leading-relaxed">{aiExplanation}</p>
              </div>
            ) : (
              <button
                onClick={fetchAiExplanation}
                disabled={aiLoading}
                className="flex items-center gap-1.5 text-sm text-blue-700 hover:text-blue-900 font-medium transition-colors disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {aiLoading ? 'Generating explanation...' : 'Explain with AI'}
              </button>
            )}
          </div>

          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded">
            <p className="text-sm text-yellow-900 font-medium">
              ⚠️ This issue must be resolved before payroll can be approved
            </p>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
