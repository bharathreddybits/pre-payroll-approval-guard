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
 * Run Python CSV validation script
 */
function validateCSV(filePath: string): Promise<{ valid: boolean; errors: string[]; warnings: string[]; row_count: number }> {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(process.cwd(), 'tools', 'validate_csv.py');
    const python = spawn('python', [pythonScript, filePath]);

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (error) {
        reject(new Error(`Validation failed: ${stderr || error}`));
      }
    });
  });
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
      async function insertEmployeeRecords(rows: ParsedCSVRow[], datasetId: string) {
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
      }

      // Insert employee records for both datasets
      console.log('Inserting baseline employee records...');
      await insertEmployeeRecords(baselineRows, baselineDataset.dataset_id);

      console.log('Inserting current employee records...');
      await insertEmployeeRecords(currentRows, currentDataset.dataset_id);

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
