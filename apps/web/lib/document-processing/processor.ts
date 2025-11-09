/**
 * Client-side document processing.
 * Extracts text, chunks it, and creates embeddings locally.
 */

import { getCohereClient } from "../cohere/client";
import { ClientStorage, STORES } from "../client-storage/indexed-db";
import type { StoredDocument, StoredEmbedding } from "../client-storage/indexed-db";

// Simple UUID v4 generator
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface UploadResult {
  documentId: string;
  fileName: string;
  size: number;
  textExtracted: boolean;
}

export interface ProcessingResult {
  documentId: string;
  fileName: string;
  chunksCreated: number;
  embeddingsCreated: number;
}

export interface UploadProgress {
  stage: "storing" | "complete";
  progress: number; // 0-100
  message: string;
}

export interface ProcessingProgress {
  stage: "extracting" | "chunking" | "embedding" | "storing" | "complete";
  progress: number; // 0-100
  message: string;
}

/**
 * Parse CSV and convert to structured text format
 */
async function parseCSV(file: File): Promise<string> {
  const text = await file.text();
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  if (lines.length === 0) {
    throw new Error("CSV file is empty");
  }

  // Parse CSV (handle quotes and commas properly)
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  // Get headers
  const headers = parseCSVLine(lines[0]!);
  
  // Convert to structured text format
  const structuredText: string[] = [];
  
  // Add schema description
  structuredText.push(`CSV File: ${file.name}`);
  structuredText.push(`Columns: ${headers.join(', ')}`);
  structuredText.push(`Total Rows: ${lines.length - 1}`);
  structuredText.push('---');
  
  // Convert each row to natural language
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]!);
    
    if (values.length !== headers.length) {
      console.warn(`Row ${i} has ${values.length} values but expected ${headers.length}`);
      continue;
    }
    
    // Create a natural language description of the row
    const rowDescription = headers.map((header, idx) => {
      const value = values[idx]?.trim() || 'N/A';
      return `${header}: ${value}`;
    }).join(', ');
    
    structuredText.push(`Row ${i}: ${rowDescription}`);
    
    // Also create a key-value format for better retrieval
    const keyValueFormat = headers.map((header, idx) => {
      const value = values[idx]?.trim() || 'N/A';
      return `  - ${header} is ${value}`;
    }).join('\n');
    
    structuredText.push(keyValueFormat);
    structuredText.push(''); // Empty line between rows
  }
  
  return structuredText.join('\n');
}

/**
 * Extract text from various file types
 */
async function extractText(file: File): Promise<string> {
  const mimeType = file.type;

  // Plain text files
  if (mimeType.startsWith("text/") && !mimeType.includes("csv")) {
    return await file.text();
  }

  // CSV files - NEW IMPROVED HANDLING
  if (mimeType === "text/csv" || file.name.endsWith('.csv')) {
    try {
      console.log("Parsing CSV file with structured format...");
      return await parseCSV(file);
    } catch (error) {
      console.error("CSV parsing error:", error);
      throw new Error("Failed to parse CSV: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }

  // PDF files - use pdfjs-dist with proper configuration
  if (mimeType === "application/pdf") {
    try {
      // Dynamic import with proper worker configuration
      const pdfjsLib = await import("pdfjs-dist");
      
      // Configure worker using jsdelivr CDN (reliable)
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        console.log("PDF.js worker configured via CDN");
      }
      
      const arrayBuffer = await file.arrayBuffer();
      console.log("Loading PDF, size:", arrayBuffer.byteLength, "bytes");
      
      // Load PDF with proper configuration
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        verbosity: 0,
      });
      
      const pdf = await loadingTask.promise;
      console.log("PDF loaded successfully! Pages:", pdf.numPages);
      
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        console.log(`Extracting page ${i}/${pdf.numPages}...`);
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");
        fullText += pageText + "\n\n";
      }
      
      console.log("PDF text extraction complete! Total length:", fullText.length);
      
      if (!fullText.trim()) {
        throw new Error("No text could be extracted from PDF. The PDF might be image-based or empty.");
      }
      
      return fullText.trim();
    } catch (error) {
      console.error("PDF extraction error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to extract text from PDF: ${errorMessage}`);
    }
  }

  // Word documents - use mammoth.js
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    try {
      const mammoth = await import("mammoth");
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } catch (error) {
      console.error("DOCX extraction error:", error);
      throw new Error("Failed to extract text from DOCX: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }

  // JSON files
  if (mimeType === "application/json") {
    const text = await file.text();
    return JSON.stringify(JSON.parse(text), null, 2);
  }

  // Markdown
  if (mimeType === "text/markdown" || file.name.endsWith(".md")) {
    return await file.text();
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}

/**
 * Chunk text into smaller pieces for embedding
 * Uses smart chunking for CSV/structured data
 */
function chunkText(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200,
  isStructured: boolean = false
): string[] {
  // For CSV and structured data, chunk by logical units (rows)
  if (isStructured) {
    return chunkStructuredText(text, chunkSize);
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end).trim();

    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    // If we've reached the end, break
    if (end >= text.length) {
      break;
    }

    // Move to next chunk with overlap
    start = end - overlap;
    
    // Ensure we're making progress (prevent infinite loop)
    if (start <= chunks.length * (chunkSize - overlap)) {
      start = end - Math.min(overlap, Math.floor(chunkSize / 2));
    }
  }

  return chunks;
}

/**
 * Smart chunking for structured data (CSV, tables)
 * Keeps complete rows together
 */
function chunkStructuredText(text: string, maxChunkSize: number = 4000): string[] {
  const lines = text.split('\n');
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentSize = 0;

  // Keep header with all chunks
  const headerLines: string[] = [];
  let i = 0;
  
  // Extract header section (everything before "---" or first "Row")
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.includes('---') || line.startsWith('Row ')) {
      break;
    }
    headerLines.push(line);
    i++;
  }

  const header = headerLines.join('\n');
  const headerSize = header.length;

  // Skip separator line
  if (lines[i]?.includes('---')) {
    i++;
  }

  // Process rows
  while (i < lines.length) {
    const line = lines[i]!
    
    // Check if this is a row boundary (starts with "Row " or empty line after data)
    const isRowStart = line.startsWith('Row ');
    
    if (isRowStart && currentChunk.length > 0 && currentSize + line.length + headerSize > maxChunkSize) {
      // Flush current chunk
      chunks.push(header + '\n' + currentChunk.join('\n'));
      currentChunk = [];
      currentSize = 0;
    }

    currentChunk.push(line);
    currentSize += line.length + 1; // +1 for newline
    i++;
  }

  // Add final chunk
  if (currentChunk.length > 0) {
    chunks.push(header + '\n' + currentChunk.join('\n'));
  }

  console.log(`[Chunking] Created ${chunks.length} structured chunks (avg size: ${Math.round(chunks.reduce((sum, c) => sum + c.length, 0) / chunks.length)} chars)`);

  return chunks.length > 0 ? chunks : [text];
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i]! * vecB[i]!;
    normA += vecA[i]! * vecA[i]!;
    normB += vecB[i]! * vecB[i]!;
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Merge similar chunks to reduce redundancy
 * @param chunks - Original text chunks
 * @param embeddings - Embeddings for each chunk
 * @param similarityThreshold - Threshold for merging (0.9 = 90% similar)
 * @returns Merged chunks and their embeddings
 */
function mergeSimilarChunks(
  chunks: string[],
  embeddings: number[][],
  similarityThreshold: number = 0.9
): { chunks: string[]; embeddings: number[][] } {
  if (chunks.length !== embeddings.length) {
    throw new Error("Chunks and embeddings length mismatch");
  }

  console.log(`[ChunkMerge] Starting with ${chunks.length} chunks, threshold: ${similarityThreshold}`);

  const merged: string[] = [];
  const mergedEmbeddings: number[][] = [];
  const processed = new Set<number>();

  for (let i = 0; i < chunks.length; i++) {
    if (processed.has(i)) continue;

    let currentChunk = chunks[i]!;
    let currentEmbedding = embeddings[i]!;
    const similarIndices = [i];

    // Find similar chunks
    for (let j = i + 1; j < chunks.length; j++) {
      if (processed.has(j)) continue;

      const similarity = cosineSimilarity(currentEmbedding, embeddings[j]!);
      
      if (similarity >= similarityThreshold) {
        console.log(`[ChunkMerge] Found similar chunks: ${i} and ${j}, similarity: ${similarity.toFixed(3)}`);
        similarIndices.push(j);
      }
    }

    // If we found similar chunks, merge them
    if (similarIndices.length > 1) {
      console.log(`[ChunkMerge] Merging ${similarIndices.length} similar chunks`);
      
      // Merge text (combine unique sentences)
      const mergedText = [...new Set(
        similarIndices
          .map(idx => chunks[idx]!)
          .join(' ')
          .split(/[.!?]+/)
          .map(s => s.trim())
          .filter(s => s.length > 0)
      )].join('. ') + '.';

      // Average embeddings
      const avgEmbedding = new Array(currentEmbedding.length).fill(0);
      for (const idx of similarIndices) {
        processed.add(idx);
        const emb = embeddings[idx]!;
        for (let k = 0; k < emb.length; k++) {
          avgEmbedding[k] += emb[k]! / similarIndices.length;
        }
      }

      merged.push(mergedText);
      mergedEmbeddings.push(avgEmbedding);
    } else {
      // Keep original chunk
      processed.add(i);
      merged.push(currentChunk);
      mergedEmbeddings.push(currentEmbedding);
    }
  }

  console.log(`[ChunkMerge] Reduced from ${chunks.length} to ${merged.length} chunks (${((1 - merged.length / chunks.length) * 100).toFixed(1)}% reduction)`);

  return { chunks: merged, embeddings: mergedEmbeddings };
}

/**
 * STAGE 1: Upload and store document without processing
 * Just stores the raw file for later processing (NO text extraction yet)
 */
export async function uploadDocument(
  file: File,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  const documentId = generateUUID();
  const storage = new ClientStorage();

  // Store raw file data
  onProgress?.({
    stage: "storing",
    progress: 50,
    message: "Storing document...",
  });

  const fileData = await file.arrayBuffer();

  const document: StoredDocument = {
    id: documentId,
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    uploadedAt: Date.now(),
    textContent: "", // Empty until processed
    userId,
    processed: false, // Not yet processed
    fileData, // Store raw file data for later extraction
  };

  await storage.addDocument(document);

  // Complete
  onProgress?.({
    stage: "complete",
    progress: 100,
    message: "Document uploaded successfully!",
  });

  return {
    documentId,
    fileName: file.name,
    size: file.size,
    textExtracted: false, // Will be extracted during processing
  };
}

/**
 * STAGE 2: Process a stored document (create embeddings)
 * Takes a document ID and creates embeddings for it
 */
export async function processStoredDocument(
  documentId: string,
  userId: string,
  onProgress?: (progress: ProcessingProgress) => void
): Promise<ProcessingResult> {
  const cohereClient = getCohereClient();
  if (!cohereClient) {
    throw new Error("Cohere API key not set. Please provide your API key first.");
  }

  const storage = new ClientStorage();
  
  // Get the stored document
  const document = await storage.getDocument(documentId);
  if (!document) {
    throw new Error("Document not found");
  }

  if (document.userId !== userId) {
    throw new Error("Unauthorized: Document belongs to another user");
  }

  if (document.processed) {
    throw new Error("Document already processed");
  }

  // Stage 1: Extract text from stored file data
  let textContent = document.textContent;
  
  if (!textContent && document.fileData) {
    onProgress?.({
      stage: "extracting",
      progress: 10,
      message: "Extracting text from document...",
    });

    // Recreate File object from stored data
    const blob = new Blob([document.fileData], { type: document.mimeType });
    const file = new File([blob], document.fileName, { type: document.mimeType });
    
    textContent = await extractText(file);
    
    // Update document with extracted text
    document.textContent = textContent;
    await storage.updateDocument(document);
  }

  if (!textContent) {
    throw new Error("Failed to extract text from document");
  }

  // Stage 2: Chunk text
  onProgress?.({
    stage: "chunking",
    progress: 20,
    message: "Splitting document into chunks...",
  });

  const isCSV = document.mimeType === "text/csv" || document.fileName.endsWith('.csv');
  const chunks = chunkText(textContent, 1000, 200, isCSV);

  console.log(`[Processing] Created ${chunks.length} chunks from ${document.fileName}`);

  // Stage 3: Create embeddings
  onProgress?.({
    stage: "embedding",
    progress: 30,
    message: `Creating embeddings for ${chunks.length} chunks...`,
  });

  // Batch embeddings (Cohere supports up to 96 texts per request)
  const batchSize = 90;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const embeddings = await cohereClient.embed(batch, {
      inputType: "search_document",
    });
    allEmbeddings.push(...embeddings);

    const progressPercent = 30 + (i / chunks.length) * 40;
    onProgress?.({
      stage: "embedding",
      progress: progressPercent,
      message: `Created ${i + batch.length}/${chunks.length} embeddings...`,
    });
  }

  // NEW: Stage 3.5: Merge similar chunks
  onProgress?.({
    stage: "embedding",
    progress: 70,
    message: "Detecting and merging similar chunks...",
  });

  // Determine merge threshold based on file type
  const isCSVFile = document.mimeType === "text/csv" || document.fileName.endsWith('.csv');
  const mergeThreshold = isCSVFile ? 0.95 : 0.92; // Higher threshold for CSV to preserve rows
  
  console.log(`[Processing] File type: ${document.mimeType}, merge threshold: ${mergeThreshold}`);

  const { chunks: mergedChunks, embeddings: mergedEmbeddings } = mergeSimilarChunks(
    chunks,
    allEmbeddings,
    mergeThreshold
  );

  // Stage 4: Store embeddings (use merged data)
  onProgress?.({
    stage: "storing",
    progress: 85,
    message: "Storing embeddings...",
  });

  const embeddingPromises = mergedChunks.map(async (text, idx) => {
    const embedding: StoredEmbedding = {
      id: generateUUID(),
      documentId,
      chunkIndex: idx,
      text,
      embedding: mergedEmbeddings[idx] ?? [],
      userId,
      createdAt: Date.now(),
    };
    return storage.addEmbedding(embedding);
  });

  await Promise.all(embeddingPromises);

  // Mark document as processed
  document.processed = true;
  await storage.updateDocument(document);

  // Complete
  onProgress?.({
    stage: "complete",
    progress: 100,
    message: "Document processing complete!",
  });

  return {
    documentId,
    fileName: document.fileName,
    chunksCreated: mergedChunks.length,  // Use merged count
    embeddingsCreated: mergedEmbeddings.length,
  };
}

/**
 * LEGACY: Process a document immediately (extract + embed)
 * This maintains backward compatibility with the old flow
 */
export async function processDocument(
  file: File,
  userId: string,
  onProgress?: (progress: ProcessingProgress) => void
): Promise<ProcessingResult> {
  const cohereClient = getCohereClient();
  if (!cohereClient) {
    throw new Error("Cohere API key not set. Please provide your API key first.");
  }

  const documentId = generateUUID();
  const storage = new ClientStorage();

  // Stage 1: Extract text
  onProgress?.({
    stage: "chunking",
    progress: 10,
    message: "Extracting text from document...",
  });

  const textContent = await extractText(file);

  // Stage 2: Chunk text
  onProgress?.({
    stage: "chunking",
    progress: 30,
    message: "Splitting document into chunks...",
  });

  const chunks = chunkText(textContent);

  // Stage 3: Create embeddings
  onProgress?.({
    stage: "embedding",
    progress: 40,
    message: `Creating embeddings for ${chunks.length} chunks...`,
  });

  // Batch embeddings (Cohere supports up to 96 texts per request)
  const batchSize = 96;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const embeddings = await cohereClient.embed(batch, {
      inputType: "search_document",
    });
    allEmbeddings.push(...embeddings);

    const progressPercent = 40 + (i / chunks.length) * 40;
    onProgress?.({
      stage: "embedding",
      progress: progressPercent,
      message: `Created ${i + batch.length}/${chunks.length} embeddings...`,
    });
  }

  // Stage 4: Store document and embeddings
  onProgress?.({
    stage: "storing",
    progress: 80,
    message: "Storing document and embeddings...",
  });

  // Store document metadata
  const document: StoredDocument = {
    id: documentId,
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    uploadedAt: Date.now(),
    textContent,
    userId,
    processed: true, // Already processed in legacy flow
  };

  await storage.addDocument(document);

  // Store embeddings
  const embeddingPromises = chunks.map(async (text, idx) => {
    const embedding: StoredEmbedding = {
      id: generateUUID(),
      documentId,
      chunkIndex: idx,
      text,
      embedding: allEmbeddings[idx] ?? [],
      userId,
      createdAt: Date.now(),
    };
    return storage.addEmbedding(embedding);
  });

  await Promise.all(embeddingPromises);

  // Stage 5: Complete
  onProgress?.({
    stage: "complete",
    progress: 100,
    message: "Document processing complete!",
  });

  return {
    documentId,
    fileName: file.name,
    chunksCreated: chunks.length,
    embeddingsCreated: allEmbeddings.length,
  };
}

/**
 * Upload multiple documents at once (without processing)
 */
export async function uploadDocuments(
  files: File[],
  userId: string,
  onProgress?: (fileIndex: number, progress: UploadProgress) => void
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file) continue;
    
    const result = await uploadDocument(
      file,
      userId,
      (progress) => onProgress?.(i, progress)
    );
    results.push(result);
  }

  return results;
}

/**
 * Process multiple stored documents at once
 */
export async function processStoredDocuments(
  documentIds: string[],
  userId: string,
  onProgress?: (docIndex: number, progress: ProcessingProgress) => void
): Promise<ProcessingResult[]> {
  const results: ProcessingResult[] = [];

  for (let i = 0; i < documentIds.length; i++) {
    const docId = documentIds[i];
    if (!docId) continue;
    
    const result = await processStoredDocument(
      docId,
      userId,
      (progress) => onProgress?.(i, progress)
    );
    results.push(result);
  }

  return results;
}

/**
 * LEGACY: Process multiple documents in sequence (immediate processing)
 */
export async function processDocuments(
  files: File[],
  userId: string,
  onProgress?: (fileIndex: number, progress: ProcessingProgress) => void
): Promise<ProcessingResult[]> {
  const results: ProcessingResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file) continue;
    
    const result = await processDocument(
      file,
      userId,
      (progress) => onProgress?.(i, progress)
    );
    results.push(result);
  }

  return results;
}
