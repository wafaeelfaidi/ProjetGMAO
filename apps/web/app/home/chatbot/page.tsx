'use client';

import { useCallback, useEffect, useState } from 'react';

import { embeddingService } from '~/lib/DataManagement/embeddings';
import type { FileMetadata } from '~/lib/DataManagement/supabase-file.service';
import { useSupabaseFileService } from '~/lib/DataManagement/use-supabase-file-service';

import { ChatbotPanel } from './_components/chatbot-panel';

export default function ChatbotPage() {
  const fileService = useSupabaseFileService();
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [embeddingModelInfo, setEmbeddingModelInfo] = useState({
    type: 'cohere',
    dimension: 1536,
  });

  // Initialize IndexedDB on mount and set embedding model
  useEffect(() => {
    initializeDB();
  }, []);

  const initializeDB = async () => {
    try {
      await fileService.initialize();
      await loadFiles();
      
      // Update embedding service to use Supabase
      embeddingService.setStorage(fileService);
      
      // Set Cohere as default with saved API key
      const savedCohereKey = localStorage.getItem('embedding_api_key_cohere');
      if (savedCohereKey) {
        embeddingService.setModel('cohere', savedCohereKey);
        console.log('✅ Using Cohere embedding model for search');
      } else {
        console.warn('⚠️ No Cohere API key found. Please configure in Data Management.');
        // Fallback to simple model if no API key
        embeddingService.setModel('simple', '');
      }
      
      // Update model info for display
      setEmbeddingModelInfo({
        type: embeddingService.getModelInfo().type,
        dimension: embeddingService.getModelInfo().dimension,
      });
      
      setIsReady(true);
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

  const handleSearch = useCallback(
    async (query: string, fileId?: string, topK = 5) => {
      if (!isReady) {
        console.warn('Search called before initialization completed');
        return [];
      }
      try {
        const results = await embeddingService.search(query, fileId, topK);
        return results;
      } catch (error) {
        console.error('Search failed:', error);
        throw error;
      }
    },
    [isReady],
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">AI Chatbot</h1>
        <p className="text-gray-600">
          Ask questions about your documents using RAG (Retrieval Augmented
          Generation)
        </p>
      </div>

      <ChatbotPanel
        files={files}
        onSearch={handleSearch}
        currentEmbeddingModel={embeddingModelInfo}
      />
    </div>
  );
}
