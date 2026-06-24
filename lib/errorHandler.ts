/**
 * Standardized error response utilities for API endpoints
 */

export interface ApiError {
  error: string;
  error_code: string;
  details?: string | object;
  timestamp: string;
}

export function createErrorResponse(
  error: string,
  errorCode: string,
  details?: string | object
): ApiError {
  return {
    error,
    error_code: errorCode,
    details,
    timestamp: new Date().toISOString()
  };
}

// Common error codes
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DATABASE_ERROR: 'DATABASE_ERROR',
  PROCESSING_ERROR: 'PROCESSING_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BLOCKER_EXISTS: 'BLOCKER_EXISTS',
  MISSING_FIELD: 'MISSING_FIELD',
} as const;

// Allowlist of safe message substrings. Any error message matching one of these
// is safe to include verbatim in an API response.
// Blocklist approaches (the prior implementation) fail silently for novel error types
// (e.g. raw network errors) — they returned the full error string, which can contain
// Supabase project URLs, internal IP addresses, or stack fragments.
// An allowlist guarantees unknown errors always return a generic message.
const SAFE_ERROR_PATTERNS: ReadonlyArray<RegExp> = [
  /^Missing required (field|parameter)/i,
  /^Invalid (date|format|value|parameter|input)/i,
  /^(Period|pay).*(date|must)/i,
  /^Both (baseline|current)/i,
  /^CSV (file|must|validation)/i,
  /^Employee (limit|not found)/i,
  /^Review session (not found|access)/i,
  /^Subscription (required|not found)/i,
  /^Processing timed out/i,
  /^Failed to (parse|store|create|update|save|apply|load)/i,
  /^A database constraint was violated$/,
  /^Permission denied$/,
  /^Database configuration error$/,
  /^Organization .*(not found|invalid)/i,
  /^(Baseline|Current) (CSV|file)/i,
  /^notes must/i,
  /^approval_notes must/i,
  /^runType must/i,
  /^payDate must/i,
];

/**
 * Sanitize error message to prevent exposing sensitive information.
 * Uses an allowlist: only explicitly permitted message patterns are returned
 * verbatim. All other errors (DB internals, network, stack traces) are replaced
 * with a generic string.
 */
export function sanitizeErrorMessage(error: any): string {
  const message: string =
    typeof error === 'string'
      ? error
      : typeof error?.message === 'string'
      ? error.message
      : 'An unexpected error occurred';

  // Check allowlist first
  if (SAFE_ERROR_PATTERNS.some(pattern => pattern.test(message))) {
    return message;
  }

  // Classify known DB/infra patterns into safe generic strings
  if (message.includes('duplicate key') || message.includes('violates')) {
    return 'A database constraint was violated';
  }
  if (message.includes('permission denied')) {
    return 'Permission denied';
  }
  if (message.includes('relation') && message.includes('does not exist')) {
    return 'Database configuration error';
  }

  // Unknown — return generic to prevent leaking internal details
  return 'An unexpected error occurred';
}
