import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import Papa from 'papaparse';
import { getServiceSupabase } from '../../lib/supabase';
import { processReview } from '../../lib/processReview';
import { createErrorResponse, ErrorCodes, sanitizeErrorMessage } from '../../lib/errorHandler';

// Disable body parser to handle multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

interface ParsedCSVRow {
  employee_id: string;
  employee_name?: string;
  department?: string;
  employment_status?: string;
  gross_pay: string;
  net_pay: string;
  deductions: string;
  total_deductions?: string;
  hours_worked?: string;
  rate?: string;
  [key: string]: any;
}

/**
 * Validate CSV file using JavaScript (Vercel-compatible)
 */
async function validateCSV(filePath: string): Promise<{ valid: boolean; errors: string[]; warnings: string[]; row_count: number }> {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const rows: ParsedCSVRow[] = await new Promise((resolve, reject) => {
      Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.toLowerCase().trim(),
        complete: (results) => resolve(results.data as ParsedCSVRow[]),
        error: (error: Error) => reject(error),
      });
    });

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if file has rows
    if (rows.length === 0) {
      errors.push('CSV file is empty');
      return { valid: false, errors, warnings, row_count: 0 };
    }

    // Check for required columns
    const firstRow = rows[0];
    const requiredColumns = ['employee_id', 'net_pay', 'gross_pay', 'total_deductions'];
    const missingColumns = requiredColumns.filter(col => !(col in firstRow));

    if (missingColumns.length > 0) {
      errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
      return { valid: false, errors, warnings, row_count: rows.length };
    }

    // Check for duplicate employee IDs
    const employeeIds = new Set<string>();
    const duplicates: string[] = [];

    rows.forEach((row) => {
      const empId = row.employee_id?.trim();
      if (empId) {
        if (employeeIds.has(empId)) {
          duplicates.push(empId);
        } else {
          employeeIds.add(empId);
        }
      }
    });

    if (duplicates.length > 0) {
      errors.push(`Duplicate employee IDs found: ${duplicates.slice(0, 5).join(', ')}${duplicates.length > 5 ? ` (+${duplicates.length - 5} more)` : ''}`);
    }

    // Validate data types and ranges
    const MAX_PAY_VALUE = 10000000; // $10M reasonable maximum
    const MIN_PAY_VALUE = -100000; // Allow some negative values for corrections

    rows.forEach((row, index) => {
      const rowNum = index + 2; // +2 because index 0 is row 2 (after header)

      if (!row.employee_id || row.employee_id.trim() === '') {
        errors.push(`Row ${rowNum}: Missing employee_id`);
      }

      // Validate employee_id format (alphanumeric, max 50 chars)
      if (row.employee_id && row.employee_id.length > 50) {
        errors.push(`Row ${rowNum}: employee_id too long (max 50 characters)`);
      }

      ['net_pay', 'gross_pay', 'total_deductions'].forEach(field => {
        const value = row[field];
        if (value === undefined || value === null || value === '') {
          warnings.push(`Row ${rowNum}: Missing ${field}`);
        } else {
          const numValue = Number(value);
          if (isNaN(numValue)) {
            errors.push(`Row ${rowNum}: ${field} must be a number`);
          } else {
            // Check for extreme values
            if (numValue > MAX_PAY_VALUE || numValue < MIN_PAY_VALUE) {
              errors.push(`Row ${rowNum}: ${field} value ${numValue} is outside acceptable range (${MIN_PAY_VALUE} to ${MAX_PAY_VALUE})`);
            }
          }
        }
      });

      // Validate employee_name if present
      if (row.employee_name && row.employee_name.length > 200) {
        warnings.push(`Row ${rowNum}: employee_name truncated to 200 characters`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      row_count: rows.length
    };
  } catch (error: any) {
    return {
      valid: false,
      errors: [`Validation error: ${error.message}`],
      warnings: [],
      row_count: 0
    };
  }
}

/**
 * Parse CSV file and return rows
 */
function parseCSV(filePath: string): Promise<ParsedCSVRow[]> {
  return new Promise((resolve, reject) => {
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toLowerCase().trim(),
      complete: (results) => {
        resolve(results.data as ParsedCSVRow[]);
      },
      error: (error: Error) => {
        reject(error);
      },
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = formidable({
    maxFileSize: 10 * 1024 * 1024, // 10MB max
    keepExtensions: true,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Form parse error:', err);
      return res.status(500).json({ error: 'Failed to parse form data' });
    }

    try {
      // Extract form fields
      const organizationId = Array.isArray(fields.organizationId) ? fields.organizationId[0] : fields.organizationId;
      const periodStartDate = Array.isArray(fields.periodStartDate) ? fields.periodStartDate[0] : fields.periodStartDate;
      const periodEndDate = Array.isArray(fields.periodEndDate) ? fields.periodEndDate[0] : fields.periodEndDate;
      const payDate = Array.isArray(fields.payDate) ? fields.payDate[0] : fields.payDate;
      const runType = (Array.isArray(fields.runType) ? fields.runType[0] : fields.runType) || 'regular';

      // Extract uploaded files
      const baselineFile = Array.isArray(files.baseline) ? files.baseline[0] : files.baseline;
      const currentFile = Array.isArray(files.current) ? files.current[0] : files.current;

      if (!baselineFile || !currentFile) {
        return res.status(400).json({ error: 'Both baseline and current CSV files are required' });
      }

      if (!organizationId || !periodStartDate || !periodEndDate || !payDate) {
        return res.status(400).json({ error: 'Missing required metadata fields' });
      }

      const supabase = getServiceSupabase();

      // Validate both CSV files
      console.log('Validating baseline CSV...');
      const baselineValidation = await validateCSV(baselineFile.filepath);
      if (!baselineValidation.valid) {
        return res.status(400).json({
          error: 'Baseline CSV validation failed',
          details: baselineValidation.errors,
        });
      }

      console.log('Validating current CSV...');
      const currentValidation = await validateCSV(currentFile.filepath);
      if (!currentValidation.valid) {
        return res.status(400).json({
          error: 'Current CSV validation failed',
          details: currentValidation.errors,
        });
      }

      // Validate/Create organization
      // Check if organizationId is a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let finalOrganizationId = organizationId;

      if (!uuidRegex.test(organizationId)) {
        // Validate organization name format
        const orgName = organizationId.trim();

        // Check length
        if (orgName.length < 2 || orgName.length > 100) {
          return res.status(400).json({
            error: 'Invalid organization name',
            details: 'Organization name must be between 2 and 100 characters'
          });
        }

        // Check for valid characters (alphanumeric, spaces, hyphens, underscores, dots)
        const nameRegex = /^[a-zA-Z0-9\s\-_.]+$/;
        if (!nameRegex.test(orgName)) {
          return res.status(400).json({
            error: 'Invalid organization name',
            details: 'Organization name can only contain letters, numbers, spaces, hyphens, underscores, and dots'
          });
        }

        // Check if organization with this name exists
        const { data: existingOrg } = await supabase
          .from('organization')
          .select('organization_id')
          .eq('organization_name', orgName)
          .single();

        if (existingOrg) {
          finalOrganizationId = existingOrg.organization_id;
          console.log(`Using existing organization: ${orgName} (${finalOrganizationId})`);
        } else {
          // Create new organization with the validated name
          const { data: newOrg, error: orgError } = await supabase
            .from('organization')
            .insert({ organization_name: orgName })
            .select('organization_id')
            .single();

          if (orgError || !newOrg) {
            console.error('Failed to create organization:', orgError);
            return res.status(500).json({
              error: 'Failed to create organization',
              details: orgError?.message
            });
          }

          finalOrganizationId = newOrg.organization_id;
          console.log(`Created new organization: ${orgName} (${finalOrganizationId})`);
        }
      }

      // Create review session
      const { data: reviewSession, error: sessionError } = await supabase
        .from('review_session')
        .insert({
          organization_id: finalOrganizationId,
          status: 'in_progress',
        })
        .select()
        .single();

      if (sessionError || !reviewSession) {
        console.error('Failed to create review session:', sessionError);
        return res.status(500).json({ error: 'Failed to create review session' });
      }

      const reviewSessionId = reviewSession.review_session_id;

      // Parse CSV files
      console.log('Parsing CSV files...');
      const baselineRows = await parseCSV(baselineFile.filepath);
      const currentRows = await parseCSV(currentFile.filepath);

      // Insert baseline dataset
      const { data: baselineDataset, error: baselineDatasetError } = await supabase
        .from('payroll_dataset')
        .insert({
          review_session_id: reviewSessionId,
          organization_id: finalOrganizationId,
          dataset_type: 'baseline',
          period_start_date: periodStartDate,
          period_end_date: periodEndDate,
          pay_date: payDate,
          run_type: runType,
          row_count: baselineRows.length,
        })
        .select()
        .single();

      if (baselineDatasetError || !baselineDataset) {
        console.error('Failed to create baseline dataset:', baselineDatasetError);
        return res.status(500).json({ error: 'Failed to create baseline dataset' });
      }

      // Insert current dataset
      const { data: currentDataset, error: currentDatasetError } = await supabase
        .from('payroll_dataset')
        .insert({
          review_session_id: reviewSessionId,
          organization_id: finalOrganizationId,
          dataset_type: 'current',
          period_start_date: periodStartDate,
          period_end_date: periodEndDate,
          pay_date: payDate,
          run_type: runType,
          row_count: currentRows.length,
        })
        .select()
        .single();

      if (currentDatasetError || !currentDataset) {
        console.error('Failed to create current dataset:', currentDatasetError);
        return res.status(500).json({ error: 'Failed to create current dataset' });
      }

      // Helper function to insert employee records
      const insertEmployeeRecords = async (rows: ParsedCSVRow[], datasetId: string) => {
        const employeeRecords = rows.map((row) => ({
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

        // Insert in batches of 100
        const batchSize = 100;
        for (let i = 0; i < employeeRecords.length; i += batchSize) {
          const batch = employeeRecords.slice(i, i + batchSize);
          const { error } = await supabase.from('employee_pay_record').insert(batch);

          if (error) {
            console.error(`Failed to insert employee records batch ${i / batchSize + 1}:`, error);
            throw new Error('Failed to insert employee records');
          }
        }
      };

      // Insert employee records for both datasets
      console.log('Inserting baseline employee records...');
      await insertEmployeeRecords(baselineRows, baselineDataset.dataset_id);

      console.log('Inserting current employee records...');
      await insertEmployeeRecords(currentRows, currentDataset.dataset_id);

      // Process deltas and judgements directly (replaced n8n webhooks)
      let processingResult = null;
      let processingSuccess = false;

      try {
        console.log('Processing review session:', reviewSessionId);
        processingResult = await processReview(reviewSessionId);
        console.log('Processing complete:', processingResult);
        processingSuccess = processingResult.success;
      } catch (processingError: any) {
        console.error('Processing error:', processingError.message);
        processingResult = {
          success: false,
          error: processingError.message,
          delta_count: 0,
          material_count: 0,
          blocker_count: 0
        };
      } finally {
        // Clean up uploaded files after processing attempt
        try {
          if (fs.existsSync(baselineFile.filepath)) {
            fs.unlinkSync(baselineFile.filepath);
          }
          if (fs.existsSync(currentFile.filepath)) {
            fs.unlinkSync(currentFile.filepath);
          }
        } catch (cleanupError: any) {
          console.error('File cleanup error:', cleanupError.message);
          // Don't fail the request if cleanup fails
        }
      }

      // Return success response with processing results
      return res.status(200).json({
        success: true,
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
      return res.status(500).json({
        error: 'Failed to process upload',
        details: error.message,
      });
    }
  });
}
