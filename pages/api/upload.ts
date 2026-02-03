import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import Papa from 'papaparse';
import { getServiceSupabase } from '../../lib/supabase';
import { processReview } from '../../lib/processReview';
import { getOrganizationTier, isFeatureAvailable } from '../../lib/tierGating';
import { CANONICAL_FIELDS } from '../../lib/canonicalSchema';

// Disable body parser to handle multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

// ---------------------------------------------------------------------------
// CSV Parsing
// ---------------------------------------------------------------------------

function parseCSVGeneric(filePath: string): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toLowerCase().trim(),
      complete: (results) => resolve(results.data as Record<string, string>[]),
      error: (error: Error) => reject(error),
    });
  });
}

function getCSVHeaders(filePath: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    Papa.parse(fileContent, {
      header: true,
      preview: 1,
      skipEmptyLines: true,
      complete: (results) => resolve(results.meta.fields || []),
      error: (error: Error) => reject(error),
    });
  });
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
    const requiredColumns = ['employee_id', 'net_pay', 'gross_pay', 'total_deductions'];
    const missingColumns = requiredColumns.filter(col => !(col in firstRow));

    if (missingColumns.length > 0) {
      errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
      return { valid: false, errors, warnings, row_count: rows.length };
    }

    // Row-level checks: only validate data types / ranges.
    // Data quality issues (duplicates, missing IDs) are caught by the rule engine.
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

    return { valid: errors.length === 0, errors, warnings, row_count: rows.length };
  } catch (error: any) {
    return { valid: false, errors: [`Validation error: ${error.message}`], warnings: [], row_count: 0 };
  }
}

// ---------------------------------------------------------------------------
// Paid-tier Validation (flexible — just check non-empty)
// ---------------------------------------------------------------------------

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

    return { valid: true, errors: [], warnings: [], row_count: rows.length };
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
// Resolve or create organization
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

  const { data: newOrg, error: orgError } = await supabase
    .from('organization')
    .insert({ organization_name: orgName })
    .select('organization_id')
    .single();

  if (orgError || !newOrg) {
    return { orgId: '', error: orgError?.message || 'Failed to create organization' };
  }

  return { orgId: newOrg.organization_id };
}

// ---------------------------------------------------------------------------
// Main Handler
// ---------------------------------------------------------------------------

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = formidable({
    maxFileSize: 10 * 1024 * 1024,
    keepExtensions: true,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Form parse error:', err);
      return res.status(500).json({ error: 'Failed to parse form data' });
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
      if (!organizationId || !periodStartDate || !periodEndDate || !payDate) {
        return res.status(400).json({ error: 'Missing required metadata fields' });
      }

      const supabase = getServiceSupabase();

      // Resolve organization
      const { orgId: finalOrganizationId, error: orgError } = await resolveOrganization(supabase, organizationId);
      if (orgError) {
        return res.status(400).json({ error: 'Invalid organization', details: orgError });
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

      // ── Parse CSV files ──────────────────────────────────────────────────
      const baselineRows = await parseCSVGeneric(baselineFile.filepath);
      const currentRows = await parseCSVGeneric(currentFile.filepath);
      const baselineHeaders = await getCSVHeaders(baselineFile.filepath);
      const currentHeaders = await getCSVHeaders(currentFile.filepath);

      // ── Create datasets ──────────────────────────────────────────────────
      const dsFields = {
        review_session_id: reviewSessionId,
        organization_id: finalOrganizationId,
        period_start_date: periodStartDate,
        period_end_date: periodEndDate,
        pay_date: payDate,
        run_type: runType,
      };

      const { data: baselineDs, error: blDsErr } = await supabase
        .from('payroll_dataset')
        .insert({ ...dsFields, dataset_type: 'baseline', row_count: baselineRows.length })
        .select()
        .single();

      const { data: currentDs, error: curDsErr } = await supabase
        .from('payroll_dataset')
        .insert({ ...dsFields, dataset_type: 'current', row_count: currentRows.length })
        .select()
        .single();

      if (blDsErr || !baselineDs || curDsErr || !currentDs) {
        console.error('Failed to create datasets:', blDsErr || curDsErr);
        return res.status(500).json({ error: 'Failed to create datasets' });
      }

      // ── Insert employee records ──────────────────────────────────────────
      if (flexibleImport) {
        // Paid tier: store raw rows + detect employee_id
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
            const batch = records.slice(i, i + batchSize);
            const { error } = await supabase.from('employee_pay_record').insert(batch);
            if (error) throw new Error(`Failed to insert employee records: ${error.message}`);
          }
        };

        await insertFlexible(baselineRows, baselineDs.dataset_id, empIdColBaseline);
        await insertFlexible(currentRows, currentDs.dataset_id, empIdColCurrent);
      } else {
        // Starter tier: insert with known column structure
        const insertStrict = async (rows: Record<string, string>[], datasetId: string) => {
          const records = rows.map((row) => ({
            dataset_id: datasetId,
            employee_id: row.employee_id,
            employee_name: row.employee_name || null,
            department: row.department || null,
            employment_status: row.employment_status || null,
            gross_pay: parseFloat(row.gross_pay) || 0,
            net_pay: parseFloat(row.net_pay) || 0,
            total_deductions: parseFloat(row.total_deductions || row.deductions) || 0,
            metadata: {
              hours_worked: row.hours_worked ? parseFloat(row.hours_worked) : null,
              rate: row.rate ? parseFloat(row.rate) : null,
            },
          }));

          const batchSize = 100;
          for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            const { error } = await supabase.from('employee_pay_record').insert(batch);
            if (error) throw new Error(`Failed to insert employee records: ${error.message}`);
          }
        };

        await insertStrict(baselineRows, baselineDs.dataset_id);
        await insertStrict(currentRows, currentDs.dataset_id);
      }

      // ── Paid tier: return early with needsMapping ────────────────────────
      if (flexibleImport) {
        // Clean up uploaded files
        cleanupFiles(baselineFile.filepath, currentFile.filepath);

        return res.status(200).json({
          success: true,
          needsMapping: true,
          review_session_id: reviewSessionId,
          baseline: {
            headers: baselineHeaders,
            sample: baselineRows.slice(0, 10),
            row_count: baselineRows.length,
          },
          current: {
            headers: currentHeaders,
            sample: currentRows.slice(0, 10),
            row_count: currentRows.length,
          },
        });
      }

      // ── Starter tier: process immediately ──────────────────────────────
      let processingResult = null;
      let processingSuccess = false;

      try {
        processingResult = await processReview(reviewSessionId);
        processingSuccess = processingResult.success;
      } catch (processingError: any) {
        console.error('Processing error:', processingError.message);
        processingResult = {
          success: false,
          error: processingError.message,
          delta_count: 0,
          material_count: 0,
          blocker_count: 0,
        };
      } finally {
        cleanupFiles(baselineFile.filepath, currentFile.filepath);
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
      return res.status(500).json({ error: 'Failed to process upload', details: error.message });
    }
  });
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
