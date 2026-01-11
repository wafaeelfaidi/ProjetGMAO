/**
 * POST /api/home/pdr/predict
 * Make predictions
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as path from 'path';

async function spawnPythonProcess(inputData: any): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      const pythonPath = process.env.PYTHON_PATH || 'python3';
      const scriptPath = path.join(process.cwd(), 'public', 'ml', 'pipeline.py');

      const python = spawn(pythonPath, [scriptPath], { timeout: 30000 });

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
            reject(new Error(result.error || 'Prediction failed'));
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
      }, 30000);
    } catch (error) {
      reject(error);
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.model_id) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      );
    }

    if (!body.inputs) {
      return NextResponse.json(
        { error: 'Inputs are required' },
        { status: 400 }
      );
    }

    const result = await spawnPythonProcess({
      action: 'predict',
      data: body,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Prediction failed' },
      { status: 500 }
    );
  }
}
