import { Tier } from '../tierGating';

/** Severity levels for judgement rules */
export type Severity = 'blocker' | 'review' | 'info';

/**
 * Context passed to each rule's condition function.
 * Contains the full employee record data for both baseline and current,
 * plus pre-calculated delta values.
 */
export interface RuleContext {
  /** Current employee record (expanded canonical fields) */
  current: Record<string, any>;
  /** Baseline employee record (undefined for new employees) */
  baseline?: Record<string, any>;
  /** Pre-calculated metric name being evaluated */
  metric: string;
  /** Baseline numeric value */
  baselineValue?: number;
  /** Current numeric value */
  currentValue?: number;
  /** Absolute delta */
  deltaAbsolute?: number;
  /** Percentage delta */
  deltaPercentage?: number;
  /** All current employees in this run (for cross-employee checks) */
  allCurrentEmployees?: Record<string, any>[];
  /** All baseline employees (for cross-employee checks) */
  allBaselineEmployees?: Record<string, any>[];
}

/**
 * Definition of a single judgement rule.
 */
export interface RuleDefinition {
  /** Unique rule identifier, e.g. "INACTIVE_EMPLOYEE_PAID" */
  id: string;
  /** Human-readable rule name */
  name: string;
  /** Rule category */
  category: string;
  /** Severity level */
  severity: Severity;
  /** Default confidence score (0-1) */
  confidence: number;
  /** Condition function — returns true if the rule fires */
  condition: (ctx: RuleContext) => boolean;
  /** AI explanation template */
  explanation: string;
  /** Suggested user action */
  userAction: string;
  /** Canonical columns this rule examines */
  columnsUsed: string[];
  /** Minimum tier required for this rule to be active */
  minTier: Tier;
}

/**
 * Output from applying a rule.
 */
export interface Judgement {
  rule_id: string;
  rule_name: string;
  category: string;
  severity: Severity;
  is_material: boolean;
  is_blocker: boolean;
  confidence_score: number;
  reasoning: string;
  user_action: string;
  columns_used: string[];
}
