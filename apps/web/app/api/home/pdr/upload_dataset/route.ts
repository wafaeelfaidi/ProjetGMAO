/**
 * POST /api/home/pdr/upload_dataset
 * Upload and analyze CSV file
 */

import { NextRequest, NextResponse } from 'next/server';

interface UploadRequest {
  file: File;
}

// Detect CSV separator (comma, semicolon, tab, pipe)
function detectSeparator(line: string): string {
  const separators = [',', ';', '\t', '|'];
  const counts: Record<string, number> = {};
  
  for (const sep of separators) {
    counts[sep] = line.split(sep).length - 1;
  }
  
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return (sorted[0]?.[0] as string) || ',';
}

// Parse number supporting both formats: 1.5 (US) and 1,5 (FR)
function parseNumber(value: string): number | null {
  if (!value || value.trim() === '') return null;
  
  const val = value.trim();
  
  // Check if it looks like a number (digits, comma, dot, optional minus)
  if (!/^-?[\d,\.]+$/.test(val)) return null;
  
  // Count dots and commas
  const dotCount = (val.match(/\./g) || []).length;
  const commaCount = (val.match(/,/g) || []).length;
  
  let normalized = val;
  
  if (commaCount > 0 && dotCount === 0) {
    // French format: 1,5 or 1234,56
    normalized = val.replace(/,/g, '.');
  } else if (dotCount > 0 && commaCount > 0) {
    // Mixed format: 1.234,56 (FR) or 1,234.56 (US)
    if (val.lastIndexOf(',') > val.lastIndexOf('.')) {
      // French: 1.234,56
      normalized = val.replace(/\./g, '').replace(/,/g, '.');
    } else {
      // US: 1,234.56
      normalized = val.replace(/,/g, '');
    }
  } else if (commaCount > 1) {
    // Multiple commas: 1,234,567
    normalized = val.replace(/,/g, '');
  } else if (dotCount > 1) {
    // Multiple dots: 1.234.567
    normalized = val.replace(/\./g, '');
  }
  
  const num = Number(normalized);
  return !isNaN(num) && isFinite(num) ? num : null;
}

async function detectTypes(data: any[]): Promise<Record<string, string>> {
  const types: Record<string, string> = {};

  if (data.length === 0) {
    return types;
  }

  const firstRow = data[0];
  for (const col of Object.keys(firstRow)) {
    const values = data.map((row) => row[col]).filter(v => v !== null && v !== undefined && v !== '');

    if (values.length === 0) {
      types[col] = 'categorical';
      continue;
    }

    // Check if all are dates FIRST (before numeric check)
    const dateCount = values.filter(v => {
      if (typeof v !== 'string') return false;
      const datePatterns = [
        /^\d{4}-\d{2}-\d{2}$/,                    // 2025-03-29
        /^\d{2}\/\d{2}\/\d{4}$/,                 // 29/03/2025 or 03/29/2025
        /^\d{4}\/\d{2}\/\d{2}$/,                 // 2025/03/29
        /^\d{2}-\d{2}-\d{4}$/,                    // 29-03-2025
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO with time
        /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/,    // 29/03/2025 14:30
      ];
      return datePatterns.some((p) => p.test(String(v)));
    }).length;
    
    const dateRatio = dateCount / values.length;
    if (dateRatio > 0.8) {
      types[col] = 'datetime';
      continue;
    }

    // Check if values are numeric (supports French format with comma)
    const numericCount = values.filter(v => {
      if (typeof v === 'number') return true;
      if (typeof v === 'string') {
        return parseNumber(v) !== null;
      }
      return false;
    }).length;
    
    const numericRatio = numericCount / values.length;
    if (numericRatio > 0.8) {
      types[col] = 'numerical';
      continue;
    }

    // Check if all are booleans
    const booleanCount = values.filter(v =>
      v === true ||
      v === false ||
      v === 'true' ||
      v === 'false' ||
      v === 1 ||
      v === 0 ||
      v === '1' ||
      v === '0'
    ).length;
    
    const booleanRatio = booleanCount / values.length;
    if (booleanRatio > 0.8) {
      types[col] = 'boolean';
      continue;
    }

    types[col] = 'categorical';
  }

  return types;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Accept CSV and TSV files
    if (!file.name.match(/\.(csv|tsv|txt)$/i)) {
      return NextResponse.json({ error: 'Only CSV/TSV files are supported' }, { status: 400 });
    }

    // Read file content with proper encoding handling
    const buffer = await file.arrayBuffer();
    const decoder = new TextDecoder('utf-8');
    const content = decoder.decode(buffer);
    const lines = content.trim().split('\n').filter((line: string) => line.trim());

    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file is empty or has no data' }, { status: 400 });
    }

    // Detect separator
    const firstLine = lines[0];
    if (!firstLine) {
      return NextResponse.json({ error: 'Empty file' }, { status: 400 });
    }
    const separator = detectSeparator(firstLine);

    // Parse CSV with detected separator
    const headerLine = lines[0];
    if (!headerLine) {
      return NextResponse.json({ error: 'Empty header line' }, { status: 400 });
    }

    const headers = headerLine.split(separator).map((h: string) => h.trim().replace(/^"|"/g, ''));
    const data = lines.slice(1).map((line: string) => {
      const values = line.split(separator).map((v: string) => v.trim().replace(/^"|"/g, ''));
      const row: Record<string, any> = {};
      headers.forEach((header: string, idx: number) => {
        const val = values[idx] || '';
        
        // Skip empty values
        if (!val || val === '') {
          row[header] = null;
          return;
        }
        
        // Try to parse as number (supports French format with comma)
        const numVal = parseNumber(val);
        if (numVal !== null) {
          row[header] = numVal;
        } else if (val.toLowerCase() === 'true') {
          row[header] = true;
        } else if (val.toLowerCase() === 'false') {
          row[header] = false;
        } else {
          row[header] = val;
        }
      });
      return row;
    }).filter((row: Record<string, any>) => Object.values(row).some((v) => v !== null && v !== ''));

    if (data.length === 0) {
      return NextResponse.json({ error: 'No valid data rows found' }, { status: 400 });
    }

    // Detect types
    const column_types = await detectTypes(data);

    // Return info
    return NextResponse.json({
      preview: data.slice(0, 5),
      column_types,
      rows: data.length,
      columns: headers.length,
      separator,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
