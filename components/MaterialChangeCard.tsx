import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

interface MaterialChangeCardProps {
  change: {
    employee_id: string;
    metric: string;
    component_name?: string;
    baseline_value: number | null;
    current_value: number | null;
    delta_absolute: number | null;
    delta_percentage: number | null;
    change_type: string;
    material_judgement: {
      confidence_score: number;
      reasoning: string;
      rule_id: string;
    } | null;
  };
}

export function MaterialChangeCard({ change }: MaterialChangeCardProps) {
  const formatCurrency = (value: number | null) => {
    if (value === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatMetric = (metric: string, componentName?: string) => {
    if (metric === 'component' && componentName) {
      return componentName;
    }
    return metric
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return 'bg-orange-500 text-white';
    if (score >= 0.75) return 'bg-yellow-500 text-white';
    return 'bg-gray-400 text-white';
  };

  const getChangeTypeColor = (changeType: string) => {
    if (changeType === 'increase') return 'text-green-600';
    if (changeType === 'decrease') return 'text-red-600';
    if (changeType === 'new_employee') return 'text-blue-600';
    if (changeType === 'removed_employee') return 'text-purple-600';
    return 'text-gray-600';
  };

  const confidenceScore = change.material_judgement?.confidence_score || 0;

  return (
    <Card className="mb-3 border-l-4 border-l-yellow-500 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
              #{change.employee_id}
            </span>
            <span className="text-sm text-muted-foreground">
              {formatMetric(change.metric, change.component_name)}
            </span>
          </div>
          <Badge className={getConfidenceColor(confidenceScore)}>
            {Math.round(confidenceScore * 100)}% confidence
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="text-sm text-gray-600">
            {formatCurrency(change.baseline_value)}
          </div>
          <div className="text-2xl font-bold text-gray-400">&rarr;</div>
          <div className={`text-lg font-bold ${getChangeTypeColor(change.change_type)}`}>
            {formatCurrency(change.current_value)}
          </div>
          {change.delta_percentage !== null && (
            <Badge variant="outline" className="font-mono">
              {change.delta_percentage > 0 ? '+' : ''}
              {change.delta_percentage.toFixed(1)}%
            </Badge>
          )}
        </div>

        {change.delta_absolute !== null && (
          <div className="text-sm text-gray-600 mb-3">
            Change amount: {change.delta_absolute > 0 ? '+' : ''}
            {formatCurrency(change.delta_absolute)}
          </div>
        )}

        <Accordion type="single" collapsible className="border-t pt-2">
          <AccordionItem value="reasoning" className="border-0">
            <AccordionTrigger className="py-2 text-sm hover:no-underline">
              <span className="flex items-center gap-2">
                <span>Why this was flagged</span>
                <span className="text-xs font-mono text-muted-foreground">
                  {change.material_judgement?.rule_id}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-gray-700 bg-yellow-50 p-3 rounded border border-yellow-200">
                {change.material_judgement?.reasoning || 'No reasoning provided'}
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

      </CardContent>
    </Card>
  );
}
