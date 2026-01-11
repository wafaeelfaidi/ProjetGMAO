/**
 * POST /api/home/pdr/train_model
 * Train ML model
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as path from 'path';

async function spawnPythonProcess(inputData: any): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      const pythonPath = process.env.PYTHON_PATH || 'python3';
      const scriptPath = path.join(process.cwd(), 'public', 'ml', 'pipeline.py');

      const python = spawn(pythonPath, [scriptPath], { timeout: 120000 });

      let output = '';
      let errorOutput = '';

      python.stdout?.on('data', (data) => {
        output += data.toString();
      });

      python.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      python.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python error: ${errorOutput}`));
          return;
        }

        try {
          const result = JSON.parse(output);
          if (!result.success) {
            reject(new Error(result.error || 'Training failed'));
          } else {
            resolve(result);
          }
        } catch (e) {
          reject(new Error(`Failed to parse Python output: ${output}`));
        }
      });

      python.stdin?.write(JSON.stringify(inputData));
      python.stdin?.end();

      setTimeout(() => {
        python.kill();
        reject(new Error('Python process timeout'));
      }, 120000);
    } catch (error) {
      reject(error);
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.target_column) {
      return NextResponse.json(
        { error: 'Target column is required' },
        { status: 400 }
      );
    }

    if (!body.task_type) {
      return NextResponse.json(
        { error: 'Task type is required' },
        { status: 400 }
      );
    }

    // Validate target column exists in preprocessed data
    if (body.preprocessed_data && body.preprocessed_data.length > 0) {
      const columns = Object.keys(body.preprocessed_data[0]);
      if (!columns.includes(body.target_column)) {
        return NextResponse.json(
          { 
            error: `Target column "${body.target_column}" not found. Available columns: ${columns.join(', ')}` 
          },
          { status: 400 }
        );
      }
    }

    const result = await spawnPythonProcess({
      action: 'train',
      data: body,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Training failed' },
      { status: 500 }
    );
  }
}
