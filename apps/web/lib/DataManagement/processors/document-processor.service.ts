/**
 * Document Processing Service
 * Handles unique processing strategies for different document types
 */

import { extractText, chunkText, cleanText } from '../parsers';

export type DocumentType = 
  | 'pdf' 
  | 'docx' 
  | 'txt' 
  | 'markdown' 
  | 'csv' 
  | 'excel' 
  | 'json' 
  | 'xml' 
  | 'html' 
  | 'unknown';

export interface ProcessingConfig {
  chunkSize?: number;
  overlap?: number;
  preserveFormatting?: boolean;
  extractMetadata?: boolean;
}

export interface ProcessedDocument {
  documentType: DocumentType;
  chunks: string[];
  metadata: {
    wordCount: number;
    charCount: number;
    chunkCount: number;
    processingStrategy: string;
    extractedMetadata?: Record<string, any>;
  };
}

/**
 * Document Processor Factory
 * Routes documents to appropriate processor based on type
 */
export class DocumentProcessor {
  private config: Required<ProcessingConfig>;

  constructor(config: ProcessingConfig = {}) {
    this.config = {
      chunkSize: config.chunkSize || 500,
      overlap: config.overlap || 50,
      preserveFormatting: config.preserveFormatting ?? false,
      extractMetadata: config.extractMetadata ?? true,
    };
  }

  /**
   * Process a document based on its type
   */
  async processDocument(
    fileData: ArrayBuffer,
    fileName: string,
    mimeType: string,
  ): Promise<ProcessedDocument> {
    const documentType = this.detectDocumentType(fileName, mimeType);

    switch (documentType) {
      case 'pdf':
        return this.processPDF(fileData, fileName);
      
      case 'docx':
        return this.processDOCX(fileData, fileName);
      
      case 'txt':
        return this.processTXT(fileData, fileName);
      
      case 'markdown':
        return this.processMarkdown(fileData, fileName);
      
      case 'csv':
        return this.processCSV(fileData, fileName);
      
      case 'json':
        return this.processJSON(fileData, fileName);
      
      case 'xml':
        return this.processXML(fileData, fileName);
      
      case 'html':
        return this.processHTML(fileData, fileName);
      
      default:
        throw new Error(`Unsupported document type: ${documentType}`);
    }
  }

  /**
   * Detect document type from filename and MIME type
   */
  private detectDocumentType(fileName: string, mimeType: string): DocumentType {
    const extension = fileName.split('.').pop()?.toLowerCase();

    if (extension === 'pdf' || mimeType.includes('pdf')) return 'pdf';
    if (extension === 'docx' || extension === 'doc' || mimeType.includes('wordprocessingml')) return 'docx';
    if (extension === 'txt' || mimeType === 'text/plain') return 'txt';
    if (extension === 'md' || extension === 'markdown') return 'markdown';
    if (extension === 'csv' || mimeType === 'text/csv') return 'csv';
    if (extension === 'xlsx' || extension === 'xls' || mimeType.includes('spreadsheetml')) return 'excel';
    if (extension === 'json' || mimeType === 'application/json') return 'json';
    if (extension === 'xml' || mimeType.includes('xml')) return 'xml';
    if (extension === 'html' || extension === 'htm' || mimeType === 'text/html') return 'html';

    return 'unknown';
  }

  /**
   * Process PDF documents
   * Strategy: Extract text, preserve structure, chunk by sections
   */
  private async processPDF(fileData: ArrayBuffer, fileName: string): Promise<ProcessedDocument> {
    const parseResult = await extractText(fileData, 'application/pdf', fileName);
    const cleanedText = cleanText(parseResult.text);
    
    // Use larger chunks for PDFs as they often have better structure
    const chunks = chunkText(cleanedText, this.config.chunkSize * 1.5, this.config.overlap);

    return {
      documentType: 'pdf',
      chunks,
      metadata: {
        wordCount: parseResult.wordCount,
        charCount: parseResult.charCount,
        chunkCount: chunks.length,
        processingStrategy: 'pdf-structured-chunking',
        extractedMetadata: {
          fileName,
          format: 'pdf',
        },
      },
    };
  }

  /**
   * Process DOCX documents
   * Strategy: Extract text, preserve formatting, chunk by paragraphs
   */
  private async processDOCX(fileData: ArrayBuffer, fileName: string): Promise<ProcessedDocument> {
    const parseResult = await extractText(
      fileData, 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
      fileName
    );
    const cleanedText = cleanText(parseResult.text);
    const chunks = chunkText(cleanedText, this.config.chunkSize, this.config.overlap);

    return {
      documentType: 'docx',
      chunks,
      metadata: {
        wordCount: parseResult.wordCount,
        charCount: parseResult.charCount,
        chunkCount: chunks.length,
        processingStrategy: 'docx-paragraph-chunking',
        extractedMetadata: {
          fileName,
          format: 'docx',
        },
      },
    };
  }

  /**
   * Process TXT documents
   * Strategy: Simple chunking with overlap
   */
  private async processTXT(fileData: ArrayBuffer, fileName: string): Promise<ProcessedDocument> {
    const parseResult = await extractText(fileData, 'text/plain', fileName);
    const cleanedText = cleanText(parseResult.text);
    const chunks = chunkText(cleanedText, this.config.chunkSize, this.config.overlap);

    return {
      documentType: 'txt',
      chunks,
      metadata: {
        wordCount: parseResult.wordCount,
        charCount: parseResult.charCount,
        chunkCount: chunks.length,
        processingStrategy: 'txt-simple-chunking',
        extractedMetadata: {
          fileName,
          format: 'txt',
        },
      },
    };
  }

  /**
   * Process Markdown documents
   * Strategy: Preserve markdown structure, chunk by sections
   */
  private async processMarkdown(fileData: ArrayBuffer, fileName: string): Promise<ProcessedDocument> {
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(fileData);
    
    // Split by markdown headers while preserving structure
    const chunks = this.chunkMarkdown(text);

    return {
      documentType: 'markdown',
      chunks,
      metadata: {
        wordCount: text.split(/\s+/).length,
        charCount: text.length,
        chunkCount: chunks.length,
        processingStrategy: 'markdown-section-chunking',
        extractedMetadata: {
          fileName,
          format: 'markdown',
        },
      },
    };
  }

  /**
   * Process CSV documents
   * Strategy: Convert to structured text, chunk by rows
   */
  private async processCSV(fileData: ArrayBuffer, fileName: string): Promise<ProcessedDocument> {
    const decoder = new TextDecoder('utf-8');
    const csvText = decoder.decode(fileData);
    const lines = csvText.split('\n').filter(line => line.trim());
    
    // Process CSV into readable chunks
    const chunks = this.chunkCSV(lines);

    return {
      documentType: 'csv',
      chunks,
      metadata: {
        wordCount: csvText.split(/\s+/).length,
        charCount: csvText.length,
        chunkCount: chunks.length,
        processingStrategy: 'csv-row-chunking',
        extractedMetadata: {
          fileName,
          format: 'csv',
          rowCount: lines.length - 1, // Exclude header
        },
      },
    };
  }

  /**
   * Process JSON documents
   * Strategy: Flatten structure, create searchable text
   */
  private async processJSON(fileData: ArrayBuffer, fileName: string): Promise<ProcessedDocument> {
    const decoder = new TextDecoder('utf-8');
    const jsonText = decoder.decode(fileData);
    const jsonData = JSON.parse(jsonText);
    
    // Convert JSON to searchable text
    const searchableText = this.jsonToSearchableText(jsonData);
    const chunks = chunkText(searchableText, this.config.chunkSize, this.config.overlap);

    return {
      documentType: 'json',
      chunks,
      metadata: {
        wordCount: searchableText.split(/\s+/).length,
        charCount: searchableText.length,
        chunkCount: chunks.length,
        processingStrategy: 'json-flattened-chunking',
        extractedMetadata: {
          fileName,
          format: 'json',
          structure: this.analyzeJSONStructure(jsonData),
        },
      },
    };
  }

  /**
   * Process XML documents
   * Strategy: Extract text content, preserve hierarchy
   */
  private async processXML(fileData: ArrayBuffer, fileName: string): Promise<ProcessedDocument> {
    const decoder = new TextDecoder('utf-8');
    const xmlText = decoder.decode(fileData);
    
    // Extract text from XML tags
    const textContent = xmlText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const chunks = chunkText(textContent, this.config.chunkSize, this.config.overlap);

    return {
      documentType: 'xml',
      chunks,
      metadata: {
        wordCount: textContent.split(/\s+/).length,
        charCount: textContent.length,
        chunkCount: chunks.length,
        processingStrategy: 'xml-text-extraction',
        extractedMetadata: {
          fileName,
          format: 'xml',
        },
      },
    };
  }

  /**
   * Process HTML documents
   * Strategy: Extract text, remove scripts/styles
   */
  private async processHTML(fileData: ArrayBuffer, fileName: string): Promise<ProcessedDocument> {
    const decoder = new TextDecoder('utf-8');
    const htmlText = decoder.decode(fileData);
    
    // Remove scripts, styles, and extract text
    const textContent = htmlText
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    const chunks = chunkText(textContent, this.config.chunkSize, this.config.overlap);

    return {
      documentType: 'html',
      chunks,
      metadata: {
        wordCount: textContent.split(/\s+/).length,
        charCount: textContent.length,
        chunkCount: chunks.length,
        processingStrategy: 'html-text-extraction',
        extractedMetadata: {
          fileName,
          format: 'html',
        },
      },
    };
  }

  /**
   * Helper: Chunk markdown by sections
   */
  private chunkMarkdown(text: string): string[] {
    const sections = text.split(/(?=^#{1,6}\s)/m);
    const chunks: string[] = [];
    
    for (const section of sections) {
      if (section.length > this.config.chunkSize * 2) {
        // Section too large, use regular chunking
        chunks.push(...chunkText(section, this.config.chunkSize, this.config.overlap));
      } else {
        chunks.push(section.trim());
      }
    }
    
    return chunks.filter(chunk => chunk.length > 0);
  }

  /**
   * Helper: Chunk CSV by rows
   */
  private chunkCSV(lines: string[]): string[] {
    if (lines.length === 0) return [];
    
    const header = lines[0];
    const chunks: string[] = [];
    const rowsPerChunk = 50; // Adjust based on CSV complexity
    
    for (let i = 1; i < lines.length; i += rowsPerChunk) {
      const chunk = [header, ...lines.slice(i, i + rowsPerChunk)].join('\n');
      chunks.push(chunk);
    }
    
    return chunks;
  }

  /**
   * Helper: Convert JSON to searchable text
   */
  private jsonToSearchableText(obj: any, prefix = ''): string {
    let text = '';
    
    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          text += this.jsonToSearchableText(item, `${prefix}[${index}]`);
        });
      } else {
        Object.entries(obj).forEach(([key, value]) => {
          const path = prefix ? `${prefix}.${key}` : key;
          text += `${path}: ${this.jsonToSearchableText(value, path)}\n`;
        });
      }
    } else {
      text += String(obj) + ' ';
    }
    
    return text;
  }

  /**
   * Helper: Analyze JSON structure
   */
  private analyzeJSONStructure(obj: any): Record<string, any> {
    if (Array.isArray(obj)) {
      return {
        type: 'array',
        length: obj.length,
        itemType: obj.length > 0 ? typeof obj[0] : 'unknown',
      };
    } else if (typeof obj === 'object' && obj !== null) {
      return {
        type: 'object',
        keys: Object.keys(obj),
        keyCount: Object.keys(obj).length,
      };
    }
    
    return { type: typeof obj };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ProcessingConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Export singleton instance
export const documentProcessor = new DocumentProcessor();
