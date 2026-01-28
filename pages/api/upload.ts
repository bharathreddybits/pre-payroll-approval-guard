import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import Papa from 'papaparse';
import { getServiceSupabase } from '../../lib/supabase';

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

    // Validate data types
    rows.forEach((row, index) => {
      const rowNum = index + 2; // +2 because index 0 is row 2 (after header)

      if (!row.employee_id || row.employee_id.trim() === '') {
        errors.push(`Row ${rowNum}: Missing employee_id`);
      }

      ['net_pay', 'gross_pay', 'total_deductions'].forEach(field => {
        const value = row[field];
        if (value === undefined || value === null || value === '') {
          warnings.push(`Row ${rowNum}: Missing ${field}`);
        } else if (isNaN(Number(value))) {
          errors.push(`Row ${rowNum}: ${field} must be a number`);
        }
      });
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

      // Create review session
      const { data: reviewSession, error: sessionError } = await supabase
        .from('review_session')
        .insert({
          organization_id: organizationId,
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
          organization_id: organizationId,
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
          organization_id: organizationId,
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

      // Trigger n8n workflows for automated processing
      const n8nDiffUrl = process.env.N8N_DIFF_WEBHOOK_URL;
      const n8nJudgementUrl = process.env.N8N_JUDGEMENT_WEBHOOK_URL;

      if (n8nDiffUrl && n8nJudgementUrl) {
        try {
          console.log('Triggering n8n diff calculator...');
          const diffResponse = await fetch(n8nDiffUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ review_session_id: reviewSessionId }),
          });

          if (!diffResponse.ok) {
            console.error('n8n diff calculator failed:', await diffResponse.text());
          } else {
            const diffResult = await diffResponse.json();
            console.log('Diff calculator success:', diffResult);

            // Trigger judgement engine after diff calculation completes
            console.log('Triggering n8n judgement engine...');
            const judgementResponse = await fetch(n8nJudgementUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ review_session_id: reviewSessionId }),
            });

            if (!judgementResponse.ok) {
              console.error('n8n judgement engine failed:', await judgementResponse.text());
            } else {
              const judgementResult = await judgementResponse.json();
              console.log('Judgement engine success:', judgementResult);
            }
          }
        } catch (n8nError: any) {
          console.error('n8n workflow trigger error:', n8nError.message);
          // Don't fail the upload if n8n fails - data is already saved
        }
      } else {
        console.warn('n8n webhook URLs not configured - skipping automated processing');
      }

      // Clean up uploaded files
      fs.unlinkSync(baselineFile.filepath);
      fs.unlinkSync(currentFile.filepath);

      // Return success response
      return res.status(200).json({
        success: true,
        review_session_id: reviewSessionId,
        baseline_row_count: baselineRows.length,
        current_row_count: currentRows.length,
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
