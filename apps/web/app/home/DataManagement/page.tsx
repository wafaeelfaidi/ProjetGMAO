'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Database, FileText, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import type { EmbeddingProgress } from '~/lib/DataManagement/embeddings';
import { embeddingService } from '~/lib/DataManagement/embeddings';
import type { FileMetadata } from '~/lib/DataManagement/indexeddb.service';
import { indexedDBService } from '~/lib/DataManagement/indexeddb.service';

import { FileList } from './_components/file-list';
import { FileUpload } from './_components/file-upload';
import { ModelConfig } from './_components/model-config';
import { ProcessingModal } from './_components/processing-modal';
import { SearchPanel } from './_components/search-panel';

export default function DataSectionPage() {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [isProcessing, setIsProcessing] = useState<Set<string>>(new Set());
  const [processingFile, setProcessingFile] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [processingProgress, setProcessingProgress] =
    useState<EmbeddingProgress | null>(null);

  const [searchResults, setSearchResults] = useState<
    Array<{
      fileId: string;
      chunkIndex: number;
      text: string;
      similarity: number;
    }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [modelInfo, setModelInfo] = useState(embeddingService.getModelInfo());
  const [totalChunks, setTotalChunks] = useState(0);

  // Initialize IndexedDB on mount and restore saved API keys
  useEffect(() => {
    initializeDB();
    
    // Restore saved API key for current model if exists
    const currentModelType = embeddingService.getModelInfo().type;
    const savedApiKey = localStorage.getItem(`embedding_api_key_${currentModelType}`);
    if (savedApiKey && currentModelType !== 'simple') {
      embeddingService.setModel(
        currentModelType as 'simple' | 'openai' | 'cohere' | 'mistral' | 'gemini',
        savedApiKey
      );
      setModelInfo(embeddingService.getModelInfo());
    }
  }, []);

  const initializeDB = async () => {
    try {
      await indexedDBService.initialize();
      await loadFiles();
    } catch (error) {
      console.error('Failed to initialize database:', error);
      alert('Failed to initialize database. Please refresh the page.');
    }
  };

  const loadFiles = async () => {
    try {
      const fileList = await indexedDBService.listFiles();
      setFiles(fileList);
      
      // Load chunk count
      const chunkCount = await indexedDBService.getEmbeddingsCount();
      setTotalChunks(chunkCount);
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  };

  const handleFilesSelected = async (selectedFiles: File[]) => {
    for (const file of selectedFiles) {
      try {
        await indexedDBService.storeFile(file);
        await loadFiles();
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        alert(`Failed to upload ${file.name}`);
      }
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (confirm('Are you sure you want to delete this file?')) {
      try {
        await indexedDBService.deleteFile(fileId);
        await loadFiles();
      } catch (error) {
        console.error('Failed to delete file:', error);
        alert('Failed to delete file');
      }
    }
  };

  const handleProcessFile = useCallback(async (fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    if (!file) return;

    // Check if it's a CSV file
    if (file.type.includes('csv')) {
      alert('CSV files are not processed for embeddings');
      return;
    }

    setIsProcessing((prev) => new Set(prev).add(fileId));
    setProcessingFile({ id: fileId, name: file.name });
    setProcessingProgress(null);

    try {
      await embeddingService.processFile(fileId, (progress) => {
        setProcessingProgress(progress);
      });

      await loadFiles();
    } catch (error) {
      console.error('Processing failed:', error);
      alert(`Failed to process file: ${error}`);
    } finally {
      setIsProcessing((prev) => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });

      // Keep modal open briefly to show completion
      setTimeout(() => {
        setProcessingFile(null);
        setProcessingProgress(null);
      }, 1500);
    }
  }, [files]);

  const handleSearch = async (
    query: string,
    fileId?: string,
    topK: number = 5,
  ) => {
    setIsSearching(true);
    try {
      const results = await embeddingService.search(query, fileId, topK);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      alert(`Search failed: ${error}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleModelChange = (
    modelType: 'simple' | 'openai' | 'cohere' | 'mistral' | 'gemini',
    apiKey?: string,
  ) => {
    embeddingService.setModel(modelType, apiKey);
    
    // Save API key to localStorage for persistence
    if (apiKey) {
      localStorage.setItem(`embedding_api_key_${modelType}`, apiKey);
    }
    
    // Update model info to trigger re-render
    setModelInfo(embeddingService.getModelInfo());
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Data Section</h1>
        <p className="text-gray-600">
          Upload files, process them for embedding, and search through your
          documents
        </p>
      </div>

      <Tabs defaultValue="files" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="files">
            <FileText className="w-4 h-4 mr-2" />
            Files
          </TabsTrigger>
          <TabsTrigger value="search">
            <Search className="w-4 h-4 mr-2" />
            Search
          </TabsTrigger>
          <TabsTrigger value="database">
            <Database className="w-4 h-4 mr-2" />
            Database
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="space-y-6">
          <FileUpload onFilesSelected={handleFilesSelected} />
          <FileList
            files={files}
            onDelete={handleDeleteFile}
            onProcess={handleProcessFile}
            isProcessing={isProcessing}
          />
        </TabsContent>

        <TabsContent value="search">
          <SearchPanel
            files={files.filter((f) => f.isProcessed)}
            onSearch={handleSearch}
            results={searchResults}
            isSearching={isSearching}
          />
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Database Statistics</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-blue-100 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-900">
                <p className="text-sm text-muted-foreground">Total Files</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{files.length}</p>
              </div>
              <div className="bg-green-100 dark:bg-green-950/30 p-4 rounded-lg border border-green-200 dark:border-green-900">
                <p className="text-sm text-muted-foreground">Processed Files</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {files.filter((f) => f.isProcessed).length}
                </p>
              </div>
              <div className="bg-orange-100 dark:bg-orange-950/30 p-4 rounded-lg border border-orange-200 dark:border-orange-900">
                <p className="text-sm text-muted-foreground">Total Chunks</p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">{totalChunks.toLocaleString()}</p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-950/30 p-4 rounded-lg border border-purple-200 dark:border-purple-900">
                <p className="text-sm text-muted-foreground">Total Size</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                  {(
                    files.reduce((sum, f) => sum + f.size, 0) /
                    (1024 * 1024)
                  ).toFixed(1)}{' '}
                  MB
                </p>
              </div>
            </div>
          </div>

          <ModelConfig
            currentModel={modelInfo}
            onModelChange={handleModelChange}
          />
        </TabsContent>
      </Tabs>

      <ProcessingModal
        isOpen={processingFile !== null}
        fileName={processingFile?.name || ''}
        progress={processingProgress}
      />
    </div>
  );
}
