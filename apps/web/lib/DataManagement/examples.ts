/**
 * Test/Example Usage of Data Section
 * 
 * This file demonstrates how to use the Data Section programmatically
 * Run in browser console or as a separate test script
 */

import { embeddingService, indexedDBService } from '~/lib/DataManagement';

/**
 * Example 1: Upload and process a simple text file
 */
export async function exampleUploadText() {
  // Initialize database
  await indexedDBService.initialize();

  // Create a sample text file
  const text = `
    Machine learning is a subset of artificial intelligence.
    It enables computers to learn from data without explicit programming.
    Common algorithms include neural networks, decision trees, and support vector machines.
  `;

  const blob = new Blob([text], { type: 'text/plain' });
  const file = new File([blob], 'machine-learning.txt', { type: 'text/plain' });

  // Store file
  const fileId = await indexedDBService.storeFile(file);

  console.log('✓ File uploaded:', fileId);

  // Process file
  await embeddingService.processFile(fileId, (progress) => {
    console.log(`[${progress.stage}] ${progress.progress}% - ${progress.message}`);
  });

  console.log('✓ File processed');
  return fileId;
}

/**
 * Example 2: Search for content
 */
export async function exampleSearch(fileId?: string) {
  const query = 'What are neural networks?';
  
  console.log(`Searching for: "${query}"`);
  
  const results = await embeddingService.search(query, fileId, 3);
  
  console.log(`\nFound ${results.length} results:\n`);
  
  results.forEach((result, idx) => {
    console.log(`${idx + 1}. [${(result.similarity * 100).toFixed(1)}% match]`);
    console.log(`   File: ${result.fileId}`);
    console.log(`   Chunk ${result.chunkIndex}: ${result.text}\n`);
  });
  
  return results;
}

/**
 * Example 3: List all files
 */
export async function exampleListFiles() {
  const files = await indexedDBService.listFiles();
  
  console.log(`Total files: ${files.length}\n`);
  
  files.forEach((file) => {
    console.log(`- ${file.name}`);
    console.log(`  ID: ${file.id}`);
    console.log(`  Size: ${(file.size / 1024).toFixed(1)} KB`);
    console.log(`  Processed: ${file.isProcessed ? '✓' : '✗'}`);
    console.log(`  Uploaded: ${new Date(file.uploadDate).toLocaleString()}\n`);
  });
  
  return files;
}

/**
 * Example 4: Get file statistics
 */
export async function exampleStats() {
  const files = await indexedDBService.listFiles();
  
  const stats = {
    totalFiles: files.length,
    processedFiles: files.filter(f => f.isProcessed).length,
    totalSize: files.reduce((sum, f) => sum + f.size, 0),
    totalWords: 0, // Not stored in simplified interface
    totalChars: 0, // Not stored in simplified interface
  };
  
  console.log('Database Statistics:');
  console.log(`- Total Files: ${stats.totalFiles}`);
  console.log(`- Processed Files: ${stats.processedFiles}`);
  console.log(`- Total Size: ${(stats.totalSize / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`- Total Words: ${stats.totalWords.toLocaleString()}`);
  console.log(`- Total Characters: ${stats.totalChars.toLocaleString()}`);
  
  return stats;
}

/**
 * Example 5: Delete a file
 */
export async function exampleDelete(fileId: string) {
  console.log(`Deleting file: ${fileId}`);
  await indexedDBService.deleteFile(fileId);
  console.log('✓ File and embeddings deleted');
}

/**
 * Example 6: Clear all data
 */
export async function exampleClearAll() {
  if (confirm('Are you sure you want to clear ALL data?')) {
    await indexedDBService.clearAll();
    console.log('✓ All data cleared');
  }
}

/**
 * Example 7: Test embedding model info
 */
export function exampleModelInfo() {
  const info = embeddingService.getModelInfo();
  
  console.log('Current Embedding Model:');
  console.log(`- Name: ${info.name}`);
  console.log(`- Type: ${info.type}`);
  console.log(`- Dimension: ${info.dimension}`);
  
  return info;
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('=== Data Section Examples ===\n');
  
  try {
    // 1. Upload and process
    console.log('1. Uploading and processing text file...');
    const fileId = await exampleUploadText();
    console.log('');
    
    // 2. List files
    console.log('2. Listing files...');
    await exampleListFiles();
    console.log('');
    
    // 3. Get stats
    console.log('3. Getting statistics...');
    await exampleStats();
    console.log('');
    
    // 4. Model info
    console.log('4. Model information...');
    exampleModelInfo();
    console.log('');
    
    // 5. Search
    console.log('5. Searching...');
    await exampleSearch(fileId);
    console.log('');
    
    console.log('=== Examples Complete ===');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Export for browser console usage
if (typeof window !== 'undefined') {
  (window as any).dataSection = {
    exampleUploadText,
    exampleSearch,
    exampleListFiles,
    exampleStats,
    exampleDelete,
    exampleClearAll,
    exampleModelInfo,
    runAllExamples,
  };
  
  console.log('Data Section examples loaded! Try:');
  console.log('- window.dataSection.runAllExamples()');
  console.log('- window.dataSection.exampleUploadText()');
  console.log('- window.dataSection.exampleSearch()');
}
