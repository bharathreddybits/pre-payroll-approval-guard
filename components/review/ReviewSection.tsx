import React from 'react';
import {
  ShieldX,
  AlertTriangle,
  FileCheck,
  TrendingUp,
  Settings,
  VolumeX,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { JudgementCard } from './JudgementCard';
import { UX_SECTION_META, type UxSection } from '../../lib/rules/uxSectionMapping';
import type { EnrichedJudgement } from '../../lib/types/review';

interface ReviewSectionProps {
  section: UxSection;
  items: EnrichedJudgement[];
  defaultExpanded?: boolean;
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  ShieldX: <ShieldX className="h-5 w-5" />,
  AlertTriangle: <AlertTriangle className="h-5 w-5" />,
  FileCheck: <FileCheck className="h-5 w-5" />,
  TrendingUp: <TrendingUp className="h-5 w-5" />,
  Settings: <Settings className="h-5 w-5" />,
  VolumeX: <VolumeX className="h-5 w-5" />,
};

const METRIC_LABELS: Record<string, string> = {
  net_pay: 'Net Pay',
  gross_pay: 'Gross Pay',
  total_deductions: 'Deductions',
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

export function ReviewSection({ section, items, defaultExpanded }: ReviewSectionProps) {
  if (items.length === 0) return null;

  const meta = UX_SECTION_META[section];
  const expanded = defaultExpanded ?? meta.defaultExpanded;
  const icon = SECTION_ICONS[meta.iconName];

  // For volatility section, group items by metric
  const isVolatility = section === 'volatility';

  const renderItems = () => {
    if (isVolatility) {
      // Group by metric for expandable sub-groups
      const grouped: Record<string, EnrichedJudgement[]> = {};
      for (const item of items) {
        const key = item.metric;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
      }

      return (
        <div className="space-y-4">
          {Object.entries(grouped).map(([metric, metricItems]) => (
            <Accordion key={metric} type="single" collapsible defaultValue={metricItems.length <= 3 ? metric : undefined}>
              <AccordionItem value={metric} className="border rounded-lg">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{formatMetricLabel(metric)}</span>
                    <Badge variant="outline" className="text-xs">{metricItems.length}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3">
                    {metricItems.map((item) => (
                      <JudgementCard key={item.judgement_id} item={item} />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {items.map((item) => (
          <JudgementCard
            key={item.judgement_id}
            item={item}
          />
        ))}
      </div>
    );
  };

  return (
    <section>
      <Accordion
        type="single"
        collapsible
        defaultValue={expanded ? section : undefined}
      >
        <AccordionItem value={section} className={`border rounded-lg ${meta.bgClass}`}>
          <AccordionTrigger className="px-5 py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <span className={meta.colorClass}>{icon}</span>
              <div className="text-left">
                <h2 className={`text-lg font-bold ${meta.colorClass}`}>
                  {meta.title}
                </h2>
                <p className="text-xs text-gray-500 font-normal">{meta.description}</p>
              </div>
              <Badge variant="outline" className={`ml-2 ${meta.colorClass} border-current`}>
                {items.length}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            {renderItems()}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}
