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
  };
}
