import { ALL_RULES, RuleDefinition } from './index';

/** Pre-built lookup map from rule_id to RuleDefinition */
const RULE_MAP: Map<string, RuleDefinition> = new Map();
for (const rule of ALL_RULES) {
  RULE_MAP.set(rule.id, rule);
}

export function getRuleById(ruleId: string): RuleDefinition | undefined {
  return RULE_MAP.get(ruleId);
}

/**
 * Return display-relevant metadata for a rule_id.
 * Returns null if the rule_id is not found in the registry.
 */
export function getRuleMetadata(ruleId: string): {
  name: string;
  category: string;
  severity: string;
  confidence: number;
  explanation: string;
  userAction: string;
  columnsUsed: string[];
  confidenceLevel: string;
  flagReason: string;
  riskStatement: string;
  commonCauses: string[];
  reviewSteps: string[];
  // New fields for 4-Line Golden Template
  judgmentCategory?: string;
  triggeredCondition?: string;
  whyThisMatters?: string;
  reviewerAction?: string;
  uiHints?: {
    defaultExpanded: boolean;
    requiresAcknowledgement: boolean;
    highlightLevel: 'RED' | 'AMBER' | 'GRAY';
  };
  systemLimits?: {
    doesNotJudgeAuthorization: boolean;
    doesNotJudgeLegalCompliance: boolean;
  };
} | null {
  const rule = RULE_MAP.get(ruleId);
  if (!rule) return null;
  return {
    name: rule.name,
    category: rule.category,
    severity: rule.severity,
    confidence: rule.confidence,
    explanation: rule.explanation,
    userAction: rule.userAction,
    columnsUsed: rule.columnsUsed,
    confidenceLevel: rule.confidenceLevel,
    flagReason: rule.flagReason,
    riskStatement: rule.riskStatement,
    commonCauses: rule.commonCauses,
    reviewSteps: rule.reviewSteps,
    // Include new fields if present
    judgmentCategory: rule.judgmentCategory,
    triggeredCondition: rule.triggeredCondition,
    whyThisMatters: rule.whyThisMatters,
    reviewerAction: rule.reviewerAction,
    uiHints: rule.uiHints,
    systemLimits: rule.systemLimits,
  };
}
