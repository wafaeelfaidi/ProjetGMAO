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
 * Extract text from various file types
 */
async function extractText(file: File): Promise<string> {
  const mimeType = file.type;

  // Plain text files
  if (mimeType.startsWith("text/")) {
    return await file.text();
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

  // CSV files
  if (mimeType === "text/csv") {
    return await file.text();
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}

/**
 * Chunk text into smaller pieces for embedding
 */
function chunkText(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): string[] {
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

  const chunks = chunkText(textContent);

  // Stage 3: Create embeddings
  onProgress?.({
    stage: "embedding",
    progress: 30,
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

    const progressPercent = 30 + (i / chunks.length) * 50;
    onProgress?.({
      stage: "embedding",
      progress: progressPercent,
      message: `Created ${i + batch.length}/${chunks.length} embeddings...`,
    });
  }

  // Stage 4: Store embeddings
  onProgress?.({
    stage: "storing",
    progress: 85,
    message: "Storing embeddings...",
  });

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
    chunksCreated: chunks.length,
    embeddingsCreated: allEmbeddings.length,
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
