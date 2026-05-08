import type { UxSection } from '../rules/uxSectionMapping';

/** UI hints for judgement card rendering */
export interface JudgementUiHints {
  defaultExpanded: boolean;
  requiresAcknowledgement: boolean;
  highlightLevel: 'RED' | 'AMBER' | 'GRAY';
}

/** System capability disclaimers */
export interface SystemLimits {
  doesNotJudgeAuthorization: boolean;
  doesNotJudgeLegalCompliance: boolean;
}

/** A single enriched judgement item, ready for UI rendering */
export interface EnrichedJudgement {
  // From DB (material_judgement)
  judgement_id: string;
  delta_id: string;
  is_material: boolean;
  is_blocker: boolean;
  confidence_score: number;
  reasoning: string;
  rule_id: string;

  reviewer_notes: string;

  // From DB (payroll_delta)
  employee_id: string;
  metric: string;
  component_name: string | null;
  baseline_value: number | null;
  current_value: number | null;
  delta_absolute: number | null;
  delta_percentage: number | null;
  change_type: string;

  // Enriched from rules registry (existing fields)
  rule_name: string;
  rule_category: string;
  rule_severity: string;
  user_action: string;
  columns_used: string[];
  confidence_level: string;
  flag_reason: string;
  risk_statement: string;
  common_causes: string[];
  review_steps: string[];

  // Enriched from rules registry (NEW fields for 4-Line Golden Template)
  judgment_category?: string; // E.g., "Net Pay Integrity", "Taxes Components Rules"
  triggered_condition?: string; // Human-readable condition (e.g., "Current net pay is negative")
  why_this_matters?: string; // Clear risk explanation (replaces risk_statement eventually)
  reviewer_action?: string; // Single, actionable next step (replaces review_steps)
  ui_hints?: JudgementUiHints; // Display hints for card rendering
  system_limits?: SystemLimits; // Disclaimers about what system doesn't judge

  // UX section assignment
  ux_section: UxSection;
}

/** Verdict status for the review page banner */
export type VerdictStatus = 'blocked' | 'review_required' | 'ready_to_approve';

/** Top-level verdict summary */
export interface Verdict {
  status: VerdictStatus;
  blockers_count: number;
  reviews_count: number;
  info_count: number;
  total_flagged: number;
  approval_status: string;
}

/** Sections grouped by UX category */
export interface ReviewSections {
  blockers: EnrichedJudgement[];
  high_risk: EnrichedJudgement[];
  compliance: EnrichedJudgement[];
  volatility: EnrichedJudgement[];
  systemic: EnrichedJudgement[];
  noise: EnrichedJudgement[];
}

/** Session metadata */
export interface ReviewSession {
  review_session_id: string;
  organization_name: string;
  status: string;
  baseline_period: string;
  current_period: string;
  pay_date: string;
  run_type: string;
  created_at: string;
}

/** Full API response for the review page */
export interface ReviewPageData {
  session: ReviewSession;
  verdict: Verdict;
  sections: ReviewSections;
  pagination: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
    next_offset: number | null;
  };
}
