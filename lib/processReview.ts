// lib/processReview.ts
//
// Re-exports the processor from the new location for backward compatibility.
// New code should import directly from lib/payroll/processor.ts.

export { processPayrollReview as processReview } from './payroll/processor';
