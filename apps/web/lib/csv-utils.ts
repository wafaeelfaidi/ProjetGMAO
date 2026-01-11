/**
 * CSV Utilities for parsing CSV files with proper encoding and separator detection
 * Handles UTF-8 encoding with accented characters (é, è, ê, etc.)
 */

export interface CSVParseResult {
  headers: string[];
  rows: Record<string, string>[];
  separator: ';' | ',';
  totalRows: number;
}

/**
 * Detects the separator used in a CSV file by analyzing the first few lines
 */
export function detectSeparator(content: string): ';' | ',' {
  const lines = content.split('\n').slice(0, 5);
  let semicolonCount = 0;
  let commaCount = 0;

  for (const line of lines) {
    semicolonCount += (line.match(/;/g) || []).length;
    commaCount += (line.match(/,/g) || []).length;
  }

  return semicolonCount > commaCount ? ';' : ',';
}

/**
 * Parses CSV content with automatic separator detection and UTF-8 support
 */
export function parseCSV(content: string): CSVParseResult {
  const separator = detectSeparator(content);
  const lines = content.split('\n').filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    throw new Error('Empty CSV file');
  }

  const headers = lines[0]!.split(separator).map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!;
    const values = line.split(separator);

    if (values.length === headers.length) {
      const row: Record<string, string> = {};

      for (let j = 0; j < headers.length; j++) {
        row[headers[j]!] = values[j]?.trim() || '';
      }

      rows.push(row);
    }
  }

  return {
    headers,
    rows,
    separator,
    totalRows: rows.length,
  };
}

/**
 * Filters rows based on a designation filter (case-insensitive)
 */
export function filterByDesignation(
  rows: Record<string, string>[],
  filter: string,
): Record<string, string>[] {
  if (!filter || filter.trim() === '') {
    return rows;
  }

  const filterLower = filter.toLowerCase().trim();

  return rows.filter((row) => {
    const designation = row['Désignation'] || row['designation'] || '';
    return designation.toLowerCase().includes(filterLower);
  });
}

/**
 * Gets unique values from a specific column
 */
export function getUniqueValues(
  rows: Record<string, string>[],
  columnName: string,
): string[] {
  const uniqueSet = new Set<string>();

  for (const row of rows) {
    const value = row[columnName];
    if (value && value.trim() !== '') {
      uniqueSet.add(value.trim());
    }
  }

  return Array.from(uniqueSet).sort();
}

/**
 * Detects if a column contains numeric values
 */
export function isNumericColumn(
  rows: Record<string, string>[],
  columnName: string,
): boolean {
  if (rows.length === 0) return false;

  const sampleSize = Math.min(20, rows.length);
  let numericCount = 0;

  for (let i = 0; i < sampleSize; i++) {
    const value = rows[i]![columnName] || '';
    // Replace French decimal separator (,) with English (.)
    const normalizedValue = value.replace(',', '.');

    if (normalizedValue.trim() !== '' && !isNaN(Number(normalizedValue))) {
      numericCount++;
    }
  }

  return numericCount / sampleSize > 0.7; // 70% threshold
}

/**
 * Detects if a column contains date values
 */
export function isDateColumn(
  rows: Record<string, string>[],
  columnName: string,
): boolean {
  if (rows.length === 0) return false;

  const sampleSize = Math.min(20, rows.length);
  let dateCount = 0;

  // Common date patterns: DD/MM/YYYY, YYYY-MM-DD, etc.
  const datePattern = /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/;

  for (let i = 0; i < sampleSize; i++) {
    const value = rows[i]![columnName] || '';
    if (datePattern.test(value.trim())) {
      dateCount++;
    }
  }

  return dateCount / sampleSize > 0.7;
}

/**
 * Parses French number format (1.234,56) to JavaScript number
 */
export function parseFrenchNumber(value: string): number {
  if (!value || value.trim() === '') return 0;

  // Remove spaces and convert French format to English
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  return parseFloat(normalized) || 0;
}

/**
 * Parses French date format (DD/MM/YYYY) to Date object
 */
export function parseFrenchDate(value: string): Date | null {
  if (!value || value.trim() === '') return null;

  const parts = value.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0]!, 10);
    const month = parseInt(parts[1]!, 10) - 1; // Month is 0-indexed
    const year = parseInt(parts[2]!, 10);

    return new Date(year, month, day);
  }

  return null;
}

/**
 * Gets statistics for a numeric column
 */
export function getNumericStats(
  rows: Record<string, string>[],
  columnName: string,
): {
  min: number;
  max: number;
  avg: number;
  sum: number;
  count: number;
} {
  const values = rows
    .map((row) => parseFrenchNumber(row[columnName] || ''))
    .filter((v) => !isNaN(v) && v !== 0);

  if (values.length === 0) {
    return { min: 0, max: 0, avg: 0, sum: 0, count: 0 };
  }

  const sum = values.reduce((acc, val) => acc + val, 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = sum / values.length;

  return { min, max, avg, sum, count: values.length };
}
