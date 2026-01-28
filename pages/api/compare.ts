import { NextApiRequest, NextApiResponse } from 'next';
import { spawn } from 'child_process';
import path from 'path';

/**
 * Run Python script and return result
 */
function runPythonScript(scriptName: string, args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(process.cwd(), 'tools', scriptName);
    const python = spawn('python', [pythonScript, ...args]);

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Script failed with code ${code}: ${stderr}`));
        return;
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (error) {
        reject(new Error(`Failed to parse script output: ${stdout}\nError: ${stderr}`));
      }
    });
  });
}

/**
 * POST /api/compare
 * Calculate differences and apply judgements for a review session
 *
 * Request body:
 *   { review_session_id: string }
 *
 * Response:
 *   {
 *     success: boolean,
 *     review_session_id: string,
 *     diff_result: {
 *       delta_count: number,
 *       baseline_employee_count: number,
 *       current_employee_count: number,
 *       new_employees: number,
 *       removed_employees: number
 *     },
 *     judgement_result: {
 *       judgement_count: number,
 *       material_count: number,
 *       blocker_count: number
 *     },
 *     timestamp: string
 *   }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { review_session_id } = req.body;

    if (!review_session_id) {
      return res.status(400).json({ error: 'review_session_id is required' });
    }

    console.log(`Starting comparison for review session: ${review_session_id}`);

    // Step 1: Run diff calculator
    console.log('Running diff calculator...');
    const diffResult = await runPythonScript('diff_calculator.py', [review_session_id]);

    if (!diffResult.success) {
      console.error('Diff calculation failed:', diffResult.error);
      return res.status(500).json({
        error: 'Failed to calculate differences',
        details: diffResult.error,
      });
    }

    console.log(`Diff calculation completed: ${diffResult.delta_count} deltas found`);

    // Step 2: Run judgement engine
    console.log('Running judgement engine...');
    const judgementResult = await runPythonScript('judgement_engine.py', [review_session_id]);

    if (!judgementResult.success) {
      console.error('Judgement application failed:', judgementResult.error);
      return res.status(500).json({
        error: 'Failed to apply judgements',
        details: judgementResult.error,
      });
    }

    console.log(
      `Judgement engine completed: ${judgementResult.material_count} material changes, ${judgementResult.blocker_count} blockers`
    );

    // Return success response
    return res.status(200).json({
      success: true,
      review_session_id,
      diff_result: {
        delta_count: diffResult.delta_count,
        baseline_employee_count: diffResult.baseline_employee_count,
        current_employee_count: diffResult.current_employee_count,
        new_employees: diffResult.new_employees,
        removed_employees: diffResult.removed_employees,
      },
      judgement_result: {
        judgement_count: judgementResult.judgement_count,
        material_count: judgementResult.material_count,
        blocker_count: judgementResult.blocker_count,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Comparison error:', error);
    return res.status(500).json({
      error: 'Failed to process comparison',
      details: error.message,
    });
  }
}
