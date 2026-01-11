/**
 * POST /api/home/pdr/preprocess
 * Preprocess dataset
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as path from 'path';

async function spawnPythonProcess(inputData: any): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      const pythonPath = process.env.PYTHON_PATH || 'python3';
      const scriptPath = path.join(process.cwd(), 'public', 'ml', 'pipeline.py');

      const python = spawn(pythonPath, [scriptPath], { timeout: 60000 });

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
            reject(new Error(result.error || 'Processing failed'));
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
      }, 60000);
    } catch (error) {
      reject(error);
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Log for debugging
    console.log('Preprocess input columns:', body.preview ? Object.keys(body.preview[0]) : 'none');

    const result = await spawnPythonProcess({
      action: 'preprocess',
      data: body,
    });

    // Log output columns
    console.log('Preprocess output columns:', result.preview ? Object.keys(result.preview[0]) : 'none');

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Preprocessing failed' },
      { status: 500 }
    );
  }
}
