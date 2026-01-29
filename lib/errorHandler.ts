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

/**
 * Sanitize error message to prevent exposing sensitive information
 */
export function sanitizeErrorMessage(error: any): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error?.message) {
    // Remove database-specific error details
    const message = error.message;
    if (message.includes('duplicate key') || message.includes('violates')) {
      return 'A database constraint was violated';
    }
    if (message.includes('permission denied')) {
      return 'Permission denied';
    }
    if (message.includes('relation') && message.includes('does not exist')) {
      return 'Database configuration error';
    }
    return message;
  }

  return 'An unexpected error occurred';
}
