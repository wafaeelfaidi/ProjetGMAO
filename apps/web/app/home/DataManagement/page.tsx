'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { FileText, BarChart3 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import type { EmbeddingProgress } from '~/lib/DataManagement/embeddings';
import { embeddingService } from '~/lib/DataManagement/embeddings';
import type { FileMetadata } from '~/lib/DataManagement/supabase-file.service';
import { useSupabaseFileService } from '~/lib/DataManagement/use-supabase-file-service';

import { FileList } from './_components/file-list';
import { FileUpload } from './_components/file-upload';
import { ProcessingModal } from './_components/processing-modal';
import { DocumentVisualization } from './_components/document-visualization';

export default function DataSectionPage() {
  const fileService = useSupabaseFileService();
  
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [isProcessing, setIsProcessing] = useState<Set<string>>(new Set());
  const [processingFile, setProcessingFile] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [processingProgress, setProcessingProgress] =
    useState<EmbeddingProgress | null>(null);

  // Initialize Supabase storage on mount and set Cohere as default model
  useEffect(() => {
    initializeDB();
    
    // Set Supabase as the storage backend for embedding service
    embeddingService.setStorage(fileService);
  }, []);

  const initializeDB = async () => {
    try {
      await fileService.initialize();
      await loadFiles();
    } catch (error) {
      console.error('Failed to initialize:', error);
      alert('Failed to initialize. Please refresh the page.');
    }
  };

  const loadFiles = async () => {
    try {
      const fileList = await fileService.listFiles();
      setFiles(fileList);
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  };

  const handleFilesSelected = async (selectedFiles: File[], isPublic: boolean) => {
    console.log('📤 handleFilesSelected called with isPublic:', isPublic);
    for (const file of selectedFiles) {
      try {
        await fileService.storeFile(file, isPublic);
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
        await fileService.deleteFile(fileId);
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
      // Storage is already set in useEffect, but ensure it's set
      embeddingService.setStorage(fileService);
      
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
  }, [files, fileService]);
  const handleVisibilityToggle = async (fileId: string, isPublic: boolean) => {
    try {
      await fileService.updateFileMetadata(fileId, { isPublic });
      await loadFiles();
    } catch (error) {
      console.error('Failed to update file visibility:', error);
      alert('Failed to update file visibility');
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Data Section</h1>
        <p className="text-gray-600">
          Upload and manage your documents with interactive visualizations
        </p>
      </div>

      <Tabs defaultValue="files" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="files">
            <FileText className="w-4 h-4 mr-2" />
            Files
          </TabsTrigger>
          <TabsTrigger value="visualization">
            <BarChart3 className="w-4 h-4 mr-2" />
            Visualization
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="space-y-6">
          <FileUpload onFilesSelected={handleFilesSelected} />
          <FileList
            files={files}
            onDelete={handleDeleteFile}
            onProcess={handleProcessFile}
            onVisibilityToggle={handleVisibilityToggle}
            isProcessing={isProcessing}
          />
        </TabsContent>

        <TabsContent value="visualization">
          <DocumentVisualization files={files} />
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
