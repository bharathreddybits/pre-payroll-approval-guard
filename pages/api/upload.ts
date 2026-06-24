import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import Papa from 'papaparse';
import { getServiceSupabase } from '../../lib/supabase';
import { verifyToken } from '../../lib/auth/verifyToken';
import { processReview } from '../../lib/processReview';
import {
  getOrganizationTier,
  checkEmployeeLimit,
  TIER_LIMITS,
  isFeatureAvailable,
} from '../../lib/billing';
import { checkSubscriptionAccess } from '../../lib/billing/entitlements';
import { CANONICAL_FIELDS } from '../../lib/canonicalSchema';
import { sanitizeErrorMessage } from '../../lib/errorHandler';

// Disable body parser to handle multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

// Vercel function timeout is 30 s; race with 25 s to allow clean failure before kill
const PROCESSING_TIMEOUT_MS = 25_000;

// ---------------------------------------------------------------------------
// CSV Parsing — async I/O to avoid blocking the Node event loop
// ---------------------------------------------------------------------------

// Read once; return both rows and headers to avoid redundant fs.readFile calls.
async function parseCSVFull(filePath: string): Promise<{ rows: Record<string, string>[]; headers: string[] }> {
  const fileContent = await fs.promises.readFile(filePath, 'utf-8');
  return new Promise((resolve, reject) => {
    Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toLowerCase().trim(),
      complete: (results) =>
        resolve({ rows: results.data as Record<string, string>[], headers: results.meta.fields ?? [] }),
      error: (error: Error) => reject(error),
    });
  });
}

// Keep backward-compat alias used by validateCSVStrict/validateCSVFlexible
async function parseCSVGeneric(filePath: string): Promise<Record<string, string>[]> {
  return (await parseCSVFull(filePath)).rows;
}

// ---------------------------------------------------------------------------
// Starter-tier Validation (rigid column requirements)
// ---------------------------------------------------------------------------

async function validateCSVStrict(
  filePath: string,
): Promise<{ valid: boolean; errors: string[]; warnings: string[]; row_count: number }> {
  try {
    const rows = await parseCSVGeneric(filePath);
    const errors: string[] = [];
    const warnings: string[] = [];

    if (rows.length === 0) {
      errors.push('CSV file is empty');
      return { valid: false, errors, warnings, row_count: 0 };
    }

    const firstRow = rows[0];
    const requiredColumns = ['employee_id', 'net_pay', 'gross_pay'];
    // Accept either 'total_deductions' or 'deductions'
    if (!('total_deductions' in firstRow) && !('deductions' in firstRow)) {
      requiredColumns.push('total_deductions');
    }
    const missingColumns = requiredColumns.filter(col => !(col in firstRow));

    if (missingColumns.length > 0) {
      errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
      return { valid: false, errors, warnings, row_count: rows.length };
    }

    const MAX_PAY_VALUE = 10000000;
    const MIN_PAY_VALUE = -100000;

    rows.forEach((row, index) => {
      const rowNum = index + 2;

      ['net_pay', 'gross_pay', 'total_deductions'].forEach(field => {
        const value = row[field];
        if (value !== undefined && value !== null && value !== '') {
          const numValue = Number(value);
          if (isNaN(numValue)) {
            errors.push(`Row ${rowNum}: ${field} must be a number`);
          } else if (numValue > MAX_PAY_VALUE || numValue < MIN_PAY_VALUE) {
            errors.push(`Row ${rowNum}: ${field} value ${numValue} is outside acceptable range`);
          }
        }
      });
    });

    errors.push(...validateCellSafety(rows));
    return { valid: errors.length === 0, errors, warnings, row_count: rows.length };
  } catch (error: any) {
    return { valid: false, errors: [`Validation error: ${error.message}`], warnings: [], row_count: 0 };
  }
}

// ---------------------------------------------------------------------------
// Paid-tier Validation (flexible — just check non-empty)
// ---------------------------------------------------------------------------

// Characters that trigger formula execution in spreadsheet applications.
// A CSV cell starting with one of these chars could execute arbitrary code
// when a finance team member opens the file in Excel or Google Sheets.
const FORMULA_INJECTION_RE = /^[=+\-@\t\r]/;
const MAX_CELL_LENGTH = 1000;

function validateCellSafety(rows: Record<string, string>[]): string[] {
  const errors: string[] = [];
  for (let i = 0; i < rows.length && errors.length < 10; i++) {
    const row = rows[i];
    for (const [col, val] of Object.entries(row)) {
      if (typeof val !== 'string') continue;
      if (val.length > MAX_CELL_LENGTH) {
        errors.push(`Row ${i + 2}, column "${col}": cell exceeds ${MAX_CELL_LENGTH} character limit`);
      }
      if (FORMULA_INJECTION_RE.test(val)) {
        errors.push(`Row ${i + 2}, column "${col}": cell begins with a formula-injection character ('${val[0]}')`);
      }
    }
  }
  return errors;
}

async function validateCSVFlexible(
  filePath: string,
): Promise<{ valid: boolean; errors: string[]; warnings: string[]; row_count: number }> {
  try {
    const rows = await parseCSVGeneric(filePath);
    const errors: string[] = [];

    if (rows.length === 0) {
      errors.push('CSV file is empty');
      return { valid: false, errors, warnings: [], row_count: 0 };
    }

    const headers = Object.keys(rows[0]);
    if (headers.length < 2) {
      errors.push('CSV must have at least 2 columns');
      return { valid: false, errors, warnings: [], row_count: rows.length };
    }

    errors.push(...validateCellSafety(rows));
    return { valid: errors.length === 0, errors, warnings: [], row_count: rows.length };
  } catch (error: any) {
    return { valid: false, errors: [`Validation error: ${error.message}`], warnings: [], row_count: 0 };
  }
}

// ---------------------------------------------------------------------------
// Detect employee_id column from flexible CSV headers
// ---------------------------------------------------------------------------

function detectEmployeeIdColumn(headers: string[]): string | null {
  const empIdField = CANONICAL_FIELDS.find(f => f.name === 'EmployeeID');
  if (!empIdField) return null;

  const allAliases = [empIdField.name, ...empIdField.aliases].map(a =>
    a.toLowerCase().replace(/[^a-z0-9]/g, ''),
  );

  for (const header of headers) {
    const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (allAliases.includes(normalized)) {
      return header;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Resolve organization (lookup only — no auto-creation)
// ---------------------------------------------------------------------------

async function resolveOrganization(
  supabase: ReturnType<typeof getServiceSupabase>,
  organizationId: string,
): Promise<{ orgId: string; error?: string }> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (uuidRegex.test(organizationId)) {
    return { orgId: organizationId };
  }

  const orgName = organizationId.trim();

  if (orgName.length < 2 || orgName.length > 100) {
    return { orgId: '', error: 'Organization name must be between 2 and 100 characters' };
  }

  const nameRegex = /^[a-zA-Z0-9\s\-_.]+$/;
  if (!nameRegex.test(orgName)) {
    return { orgId: '', error: 'Organization name can only contain letters, numbers, spaces, hyphens, underscores, and dots' };
  }

  const { data: existingOrg } = await supabase
    .from('organization')
    .select('organization_id')
    .eq('organization_name', orgName)
    .single();

  if (existingOrg) {
    return { orgId: existingOrg.organization_id };
  }

  return {
    orgId: '',
    error: `Organization "${orgName}" not found. Please use your organization UUID from the dashboard, or contact support.`,
  };
}

// ---------------------------------------------------------------------------
// Main Handler
// ---------------------------------------------------------------------------

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await verifyToken(req, res);
  if (!auth) return;
  const { user } = auth;

  // Promisify form.parse so we can use async/await throughout the handler
  // and ensure the response is always sent (callback pattern swallows thrown errors).
  const form = formidable({ maxFileSize: 10 * 1024 * 1024, keepExtensions: true });

  let fields: formidable.Fields;
  let files: formidable.Files;
  try {
    ({ fields, files } = await new Promise<{ fields: formidable.Fields; files: formidable.Files }>(
      (resolve, reject) =>
        form.parse(req, (err, f, fs_) => (err ? reject(err) : resolve({ fields: f, files: fs_ }))),
    ));
  } catch (err: any) {
    console.error('Form parse error:', err);
    return res.status(400).json({ error: 'Failed to parse form data', details: sanitizeErrorMessage(err) });
  }

  try {
    const organizationId = Array.isArray(fields.organizationId) ? fields.organizationId[0] : fields.organizationId;
    const periodStartDate = Array.isArray(fields.periodStartDate) ? fields.periodStartDate[0] : fields.periodStartDate;
    const periodEndDate = Array.isArray(fields.periodEndDate) ? fields.periodEndDate[0] : fields.periodEndDate;
    const payDate = Array.isArray(fields.payDate) ? fields.payDate[0] : fields.payDate;
    const runType = (Array.isArray(fields.runType) ? fields.runType[0] : fields.runType) || 'regular';

    const baselineFile = Array.isArray(files.baseline) ? files.baseline[0] : files.baseline;
    const currentFile = Array.isArray(files.current) ? files.current[0] : files.current;

    if (!baselineFile || !currentFile) {
      return res.status(400).json({ error: 'Both baseline and current CSV files are required' });
    }

    // MIME type validation: only text/csv and text/plain are valid CSV uploads.
    // Reject everything else early to prevent processing non-CSV binary data.
    const ALLOWED_MIME_TYPES = new Set(['text/csv', 'text/plain', 'application/csv', 'application/vnd.ms-excel']);
    for (const [label, file] of [['Baseline', baselineFile], ['Current', currentFile]] as const) {
      const mime = file.mimetype ?? '';
      if (!ALLOWED_MIME_TYPES.has(mime.split(';')[0].trim().toLowerCase())) {
        return res.status(400).json({ error: `${label} file must be a CSV file (got: ${mime || 'unknown'})` });
      }
    }

    if (!organizationId || !periodStartDate || !periodEndDate || !payDate) {
      return res.status(400).json({ error: 'Missing required metadata fields' });
    }

    // Server-side date validation
    const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
    for (const [field, value] of [['periodStartDate', periodStartDate], ['periodEndDate', periodEndDate], ['payDate', payDate]] as [string, string][]) {
      if (!ISO_DATE_RE.test(value) || isNaN(new Date(value).getTime())) {
        return res.status(400).json({ error: `Invalid date format for ${field} — expected YYYY-MM-DD` });
      }
    }
    if (periodStartDate >= periodEndDate) {
      return res.status(400).json({ error: 'Period end date must be after period start date' });
    }
    // payDate must be within ±1 year of periodEndDate.
    // A payDate more than a year away from the pay period is almost certainly a typo
    // or a client-side manipulation attempt.
    const payDateMs = new Date(payDate).getTime();
    const periodEndMs = new Date(periodEndDate).getTime();
    const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
    if (Math.abs(payDateMs - periodEndMs) > ONE_YEAR_MS) {
      return res.status(400).json({ error: 'payDate must be within 1 year of periodEndDate' });
    }
    if (!['regular', 'off_cycle'].includes(runType as string)) {
      return res.status(400).json({ error: 'runType must be "regular" or "off_cycle"' });
    }

    const supabase = getServiceSupabase();

    // Resolve organization
    const { orgId: finalOrganizationId, error: orgError } = await resolveOrganization(supabase, organizationId);
    if (orgError) {
      return res.status(400).json({ error: 'Invalid organization', details: orgError });
    }

    // Verify caller belongs to this organization
    const { data: ownershipMapping } = await supabase
      .from('user_organization_mapping')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('organization_id', finalOrganizationId)
      .single();
    if (!ownershipMapping) {
      return res.status(403).json({ error: 'Access denied: you do not belong to this organization' });
    }

    // Server-side subscription gate
    const subAccess = await checkSubscriptionAccess(finalOrganizationId);
    if (!subAccess.hasAccess) {
      return res.status(402).json({ error: 'Subscription required', upgrade_url: '/pricing' });
    }

    // Determine org tier
    const orgTier = await getOrganizationTier(finalOrganizationId);
    const flexibleImport = isFeatureAvailable(orgTier, 'flexible_import');

    console.log(`[Upload] Org tier: ${orgTier}, flexible import: ${flexibleImport}`);

    // ── Validate CSVs ────────────────────────────────────────────────────
    const validateFn = flexibleImport ? validateCSVFlexible : validateCSVStrict;

    const baselineValidation = await validateFn(baselineFile.filepath);
    if (!baselineValidation.valid) {
      return res.status(400).json({ error: 'Baseline CSV validation failed', details: baselineValidation.errors });
    }

    const currentValidation = await validateFn(currentFile.filepath);
    if (!currentValidation.valid) {
      return res.status(400).json({ error: 'Current CSV validation failed', details: currentValidation.errors });
    }

    // ── Absolute row cap — prevent Vercel timeout from enormous CSVs ────
    const MAX_ROWS_PER_FILE = 10000;
    if (baselineValidation.row_count > MAX_ROWS_PER_FILE || currentValidation.row_count > MAX_ROWS_PER_FILE) {
      cleanupFiles(baselineFile.filepath, currentFile.filepath);
      return res.status(400).json({
        error: 'File too large',
        message: `Each CSV file may contain at most ${MAX_ROWS_PER_FILE.toLocaleString()} employee rows. The uploaded file has ${Math.max(baselineValidation.row_count, currentValidation.row_count).toLocaleString()} rows. Contact support for bulk imports.`,
      });
    }

    // ── Check employee limit ─────────────────────────────────────────────
    const maxEmployeeCount = Math.max(baselineValidation.row_count, currentValidation.row_count);
    const employeeLimitCheck = await checkEmployeeLimit(finalOrganizationId, maxEmployeeCount);

    if (!employeeLimitCheck.allowed) {
      cleanupFiles(baselineFile.filepath, currentFile.filepath);
      return res.status(403).json({
        error: 'Employee limit exceeded',
        message: `Your Starter plan supports up to ${TIER_LIMITS.starter.maxEmployees} employees. This payroll has ${maxEmployeeCount} employees. Upgrade to Pro for unlimited employees.`,
        current_count: maxEmployeeCount,
        limit: TIER_LIMITS.starter.maxEmployees,
        tier: orgTier,
        upgrade_url: '/pricing',
      });
    }

    // ── Duplicate upload detection ───────────────────────────────────────
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentSessions } = await supabase
      .from('review_session')
      .select(`review_session_id, payroll_dataset!inner(period_start_date, period_end_date, run_type)`)
      .eq('organization_id', finalOrganizationId)
      .gte('created_at', fiveMinutesAgo);

    if (recentSessions) {
      const duplicate = recentSessions.find((s: any) =>
        s.payroll_dataset?.some((d: any) =>
          d.period_start_date === periodStartDate &&
          d.period_end_date === periodEndDate &&
          d.run_type === runType
        )
      );
      if (duplicate) {
        cleanupFiles(baselineFile.filepath, currentFile.filepath);
        return res.status(409).json({
          error: 'Duplicate upload detected',
          message: 'A review session for this payroll period was already created in the last 5 minutes.',
          existing_session_id: duplicate.review_session_id,
        });
      }
    }

    // ── Create review session ────────────────────────────────────────────
    const sessionStatus = flexibleImport ? 'pending_mapping' : 'in_progress';
    const { data: reviewSession, error: sessionError } = await supabase
      .from('review_session')
      .insert({ organization_id: finalOrganizationId, status: sessionStatus })
      .select()
      .single();

    if (sessionError || !reviewSession) {
      console.error('Failed to create review session:', sessionError);
      return res.status(500).json({ error: 'Failed to create review session' });
    }

    const reviewSessionId = reviewSession.review_session_id;

    // ── Parse CSV files (single read per file — rows + headers in one pass) ─
    const [baselineParsed, currentParsed] = await Promise.all([
      parseCSVFull(baselineFile.filepath),
      parseCSVFull(currentFile.filepath),
    ]);
    const { rows: baselineRows, headers: baselineHeaders } = baselineParsed;
    const { rows: currentRows, headers: currentHeaders } = currentParsed;

    // ── Create datasets ──────────────────────────────────────────────────
    const dsFields = {
      review_session_id: reviewSessionId,
      organization_id: finalOrganizationId,
      period_start_date: periodStartDate,
      period_end_date: periodEndDate,
      pay_date: payDate,
      run_type: runType,
    };

    const [{ data: baselineDs, error: blDsErr }, { data: currentDs, error: curDsErr }] = await Promise.all([
      supabase.from('payroll_dataset').insert({ ...dsFields, dataset_type: 'baseline', row_count: baselineRows.length }).select().single(),
      supabase.from('payroll_dataset').insert({ ...dsFields, dataset_type: 'current', row_count: currentRows.length }).select().single(),
    ]);

    if (blDsErr || !baselineDs || curDsErr || !currentDs) {
      console.error('Failed to create datasets:', blDsErr || curDsErr);
      await supabase.from('review_session').delete().eq('review_session_id', reviewSessionId);
      return res.status(500).json({ error: 'Failed to create datasets' });
    }

    // ── Insert employee records (with compensating delete on any failure) ─
    try {
      if (flexibleImport) {
        const empIdColBaseline = detectEmployeeIdColumn(baselineHeaders);
        const empIdColCurrent = detectEmployeeIdColumn(currentHeaders);

        const insertFlexible = async (rows: Record<string, string>[], datasetId: string, empIdCol: string | null) => {
          const records = rows.map((row, idx) => {
            const empId = empIdCol ? (row[empIdCol] || row[empIdCol.toLowerCase()])?.trim() : `unknown_${idx}`;
            return {
              dataset_id: datasetId,
              employee_id: empId || `unknown_${idx}`,
              employee_name: null,
              gross_pay: 0,
              net_pay: 0,
              total_deductions: 0,
              metadata: { raw_row: row },
            };
          });

          const batchSize = 100;
          for (let i = 0; i < records.length; i += batchSize) {
            const { error } = await supabase.from('employee_pay_record').insert(records.slice(i, i + batchSize));
            if (error) throw new Error(`Failed to insert employee records: ${error.message}`);
          }
        };

        await insertFlexible(baselineRows, baselineDs.dataset_id, empIdColBaseline);
        await insertFlexible(currentRows, currentDs.dataset_id, empIdColCurrent);
      } else {
        // Starter tier: insert with expanded column structure (requires migration 003).
        // No probe/fallback — if migration 003 is missing the insert fails with a clear error.
        const insertStrict = async (rows: Record<string, string>[], datasetId: string) => {
          const parseNum = (val: string | undefined | null): number | null => {
            if (val === undefined || val === null || val === '') return null;
            const n = parseFloat(val);
            return isNaN(n) ? null : n;
          };

          const getExpandedData = (row: Record<string, string>) => ({
            pay_group: row.pay_group || null,
            pay_frequency: row.pay_frequency || null,
            regular_hours: parseNum(row.regular_hours),
            overtime_hours: parseNum(row.overtime_hours),
            other_paid_hours: parseNum(row.other_paid_hours),
            total_hours_worked: parseNum(row.total_hours_worked),
            base_earnings: parseNum(row.base_earnings),
            overtime_pay: parseNum(row.overtime_pay),
            bonus_earnings: parseNum(row.bonus_earnings),
            other_earnings: parseNum(row.other_earnings),
            federal_income_tax: parseNum(row.federal_income_tax),
            social_security_tax: parseNum(row.social_security_tax),
            medicare_tax: parseNum(row.medicare_tax),
            state_income_tax: parseNum(row.state_income_tax),
            local_tax: parseNum(row.local_tax),
          });

          const buildRecord = (row: Record<string, string>) => ({
            dataset_id: datasetId,
            employee_id: row.employee_id,
            employee_name: row.employee_name || null,
            department: row.department || null,
            employment_status: row.employment_status || null,
            gross_pay: parseFloat(row.gross_pay) || 0,
            net_pay: parseFloat(row.net_pay) || 0,
            total_deductions: parseFloat(row.total_deductions || row.deductions) || 0,
            ...getExpandedData(row),
            metadata: {
              hours_worked: row.hours_worked ? parseFloat(row.hours_worked) : null,
              rate: row.rate ? parseFloat(row.rate) : null,
            },
          });

          const batchSize = 100;
          const records = rows.map(buildRecord);
          for (let i = 0; i < records.length; i += batchSize) {
            const { error } = await supabase.from('employee_pay_record').insert(records.slice(i, i + batchSize));
            if (error) throw new Error(`Failed to insert employee records: ${error.message}`);
          }
        };

        await insertStrict(baselineRows, baselineDs.dataset_id);
        await insertStrict(currentRows, currentDs.dataset_id);
      }
    } catch (insertError: any) {
      // Compensating delete: clean up the session (cascades to datasets + employee records)
      // so the DB is left in a consistent state with no orphaned partial data.
      console.error('Employee record insert failed, rolling back session:', insertError.message);
      await supabase.from('review_session').delete().eq('review_session_id', reviewSessionId);
      cleanupFiles(baselineFile.filepath, currentFile.filepath);
      return res.status(500).json({ error: 'Failed to store payroll data', details: sanitizeErrorMessage(insertError) });
    }

    // ── Paid tier: return early with needsMapping ────────────────────────
    if (flexibleImport) {
      cleanupFiles(baselineFile.filepath, currentFile.filepath);

      // Only return headers and row counts — raw sample rows contain payroll PII
      return res.status(200).json({
        success: true,
        needsMapping: true,
        review_session_id: reviewSessionId,
        baseline: { headers: baselineHeaders, row_count: baselineRows.length },
        current: { headers: currentHeaders, row_count: currentRows.length },
      });
    }

    // ── Starter tier: run processing with timeout guard ──────────────────
    cleanupFiles(baselineFile.filepath, currentFile.filepath);

    let processingResult = null;
    let processingSuccess = false;

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Processing timed out — payroll may be too large for synchronous processing')), PROCESSING_TIMEOUT_MS)
      );
      processingResult = await Promise.race([processReview(reviewSessionId), timeoutPromise]);
      processingSuccess = processingResult.success;
    } catch (processingError: any) {
      console.error('Processing error:', processingError.message);
      await supabase.from('review_session').update({ status: 'failed' }).eq('review_session_id', reviewSessionId);
      processingResult = {
        success: false,
        error: processingError.message,
        delta_count: 0,
        material_count: 0,
        blocker_count: 0,
      };
    }

    return res.status(200).json({
      success: true,
      needsMapping: false,
      review_session_id: reviewSessionId,
      baseline_row_count: baselineRows.length,
      current_row_count: currentRows.length,
      processing: processingResult,
      processing_completed: processingSuccess,
      warnings: [
        ...(baselineValidation.warnings || []),
        ...(currentValidation.warnings || []),
      ],
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Failed to process upload', details: sanitizeErrorMessage(error) });
  }
}

function cleanupFiles(...paths: string[]) {
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch (e: any) {
      console.error('File cleanup error:', e.message);
    }
  }
}
