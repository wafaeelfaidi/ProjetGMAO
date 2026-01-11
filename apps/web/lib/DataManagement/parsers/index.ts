/**
 * Main text extraction service
 * Routes to appropriate parser based on file type
 */

import { parseDocx, parseDocxViaApi } from './docx.parser';
import { parsePdf, parsePdfViaApi } from './pdf.parser';
import { parseTxt } from './txt.parser';

export type SupportedFileType = 'pdf' | 'txt' | 'docx' | 'csv';

export interface ParseResult {
  text: string;
  wordCount: number;
  charCount: number;
}

/**
 * Extract text from supported file types
 */
export async function extractText(
  arrayBuffer: ArrayBuffer,
  fileType: string,
  fileName: string,
): Promise<ParseResult> {
  const extension = getFileExtension(fileName, fileType);

  let text: string;

  switch (extension) {
    case 'txt':
      text = await parseTxt(arrayBuffer);
      break;

    case 'pdf':
      text = await parsePdf(arrayBuffer);
      break;

    case 'docx':
      text = await parseDocx(arrayBuffer);
      break;

    case 'csv':
      throw new Error('CSV files should not be processed for text extraction');

    default:
      throw new Error(`Unsupported file type: ${extension}`);
  }

  return {
    text,
    wordCount: text.split(/\s+/).filter((word) => word.length > 0).length,
    charCount: text.length,
  };
}

/**
 * Get file extension from filename or MIME type
 */
function getFileExtension(fileName: string, mimeType: string): string {
  // Try filename first
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex > 0) {
    return fileName.substring(dotIndex + 1).toLowerCase();
  }

  // Fallback to MIME type
  const mimeToExt: Record<string, string> = {
    'text/plain': 'txt',
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      'docx',
    'text/csv': 'csv',
  };

  return mimeToExt[mimeType] || 'unknown';
}

/**
 * Clean and prepare text for embedding
 */
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
    .trim();
}

/**
 * Split text into chunks for embedding with adaptive sizing
 */
export function chunkText(
  text: string,
  chunkSize?: number,
  overlap?: number,
): string[] {
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  const totalWords = words.length;

  // Adaptive chunk size based on text length
  let adaptiveChunkSize: number;
  let adaptiveOverlap: number;

  if (chunkSize !== undefined && overlap !== undefined) {
    // Use provided values
    adaptiveChunkSize = chunkSize;
    adaptiveOverlap = overlap;
  } else {
    // Calculate adaptive values based on text size
    if (totalWords < 200) {
      // Small text: single chunk or minimal splitting
      adaptiveChunkSize = Math.max(100, totalWords);
      adaptiveOverlap = 20;
    } else if (totalWords < 1000) {
      // Medium text: moderate chunks
      adaptiveChunkSize = 300;
      adaptiveOverlap = 50;
    } else if (totalWords < 5000) {
      // Large text: balanced chunks
      adaptiveChunkSize = 500;
      adaptiveOverlap = 75;
    } else {
      // Very large text: larger chunks with more overlap
      adaptiveChunkSize = 800;
      adaptiveOverlap = 100;
    }
  }

  const chunks: string[] = [];

  // If text is smaller than chunk size, return as single chunk
  if (totalWords <= adaptiveChunkSize) {
    return [words.join(' ')];
  }

  // Create overlapping chunks
  for (let i = 0; i < totalWords; i += adaptiveChunkSize - adaptiveOverlap) {
    const chunk = words.slice(i, i + adaptiveChunkSize).join(' ');
    if (chunk.trim().length > 0) {
      chunks.push(chunk);
    }

    // Stop if we've reached the end
    if (i + adaptiveChunkSize >= totalWords) {
      break;
    }
  }

  return chunks;
}
