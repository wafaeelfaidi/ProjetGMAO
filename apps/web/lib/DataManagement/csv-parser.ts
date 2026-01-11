/**
 * CSV Parsing Utilities (Client & Server Safe)
 * Pure utility functions with no server dependencies
 */

/**
 * Parse CSV content into headers and rows
 */
export function parseCSVContent(content: string): {
  headers: string[];
  rows: Record<string, string>[];
  separator: ';' | ',';
} {
  const lines = content.split('\n').filter((line) => line.trim());

  if (lines.length === 0) {
    return { headers: [], rows: [], separator: ',' };
  }

  // Detect separator
  const firstLine = lines[0]!;
  const separator: ';' | ',' = firstLine.includes(';') ? ';' : ',';

  // Parse headers
  const headers = firstLine.split(separator).map((h) => h.trim());

  // Parse rows
  const rows = lines.slice(1).map((line) => {
    const values = line.split(separator).map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = values[i] || '';
    });
    return row;
  });

  return { headers, rows, separator };
}
