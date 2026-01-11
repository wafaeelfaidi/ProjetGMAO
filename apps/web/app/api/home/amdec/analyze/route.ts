/**
 * POST /api/home/amdec/analyze
 * Analyze maintenance CSV for AMDEC
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// Increase timeout for AMDEC generation (can take 2-5 minutes for 10 machines)
export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

async function spawnPythonProcess(csvPath: string, generateAmdec: boolean, selectedMachines?: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      const pythonPath = process.env.PYTHON_PATH || 'python3';
      const scriptPath = path.join(process.cwd(), 'public', 'ml', 'amdec_analyzer.py');

      const python = spawn(pythonPath, [scriptPath], { timeout: 300000 }); // 5 minutes timeout

      let output = '';
      let errorOutput = '';

      python.stdout?.on('data', (data) => {
        output += data.toString();
      });

      python.stderr?.on('data', (data) => {
        errorOutput += data.toString();
        console.error('[AMDEC Python]', data.toString());
      });

      python.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python error: ${errorOutput}`));
          return;
        }

        try {
          const result = JSON.parse(output);
          if (!result.success) {
            reject(new Error(result.error || 'Analysis failed'));
          } else {
            resolve(result);
          }
        } catch (e) {
          reject(new Error(`Failed to parse Python output: ${output}`));
        }
      });

      python.stdin?.write(JSON.stringify({
        csv_path: csvPath,
        generate_amdec: generateAmdec,
        selected_machines: selectedMachines || []
      }));
      python.stdin?.end();
      
      console.log('[API] Sent to Python:', {
        csv_path: csvPath,
        generate_amdec: generateAmdec,
        selected_machines: selectedMachines || []
      });

      setTimeout(() => {
        python.kill();
        reject(new Error('Python process timeout after 5 minutes'));
      }, 300000); // 5 minutes
    } catch (error) {
      reject(error);
    }
  });
}

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const generateAmdec = formData.get('generate_amdec') === 'true';
    const selectedMachinesStr = formData.get('selected_machines') as string | null;
    const selectedMachines = selectedMachinesStr ? JSON.parse(selectedMachinesStr) : undefined;

    console.log('[API] Received request:');
    console.log('[API] - File:', file?.name);
    console.log('[API] - Generate AMDEC:', generateAmdec);
    console.log('[API] - Selected machines string:', selectedMachinesStr);
    console.log('[API] - Selected machines parsed:', selectedMachines);

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Only CSV files are allowed' },
        { status: 400 }
      );
    }

    // Save file temporarily
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    tempFilePath = path.join(os.tmpdir(), `amdec_${Date.now()}.csv`);
    fs.writeFileSync(tempFilePath, buffer);

    // Process with Python
    const result = await spawnPythonProcess(tempFilePath, generateAmdec, selectedMachines);

    // Clean up
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    // Clean up on error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    return NextResponse.json(
      { error: error.message || 'Analysis failed' },
      { status: 500 }
    );
  }
}
