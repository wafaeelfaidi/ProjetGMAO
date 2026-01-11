'use client';

import { useCallback, useEffect, useState } from 'react';

import { embeddingService } from '~/lib/DataManagement/embeddings';
import type { FileMetadata } from '~/lib/DataManagement/indexeddb.service';
import { indexedDBService } from '~/lib/DataManagement/indexeddb.service';

import { ChatbotPanel } from './_components/chatbot-panel';

export default function ChatbotPage() {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [embeddingModelInfo, setEmbeddingModelInfo] = useState({
    type: 'simple',
    dimension: 384,
  });

  // Initialize IndexedDB on mount and set embedding model
  useEffect(() => {
    initializeDB();
  }, []);

  const initializeDB = async () => {
    try {
      await indexedDBService.initialize();
      await loadFiles();
      
      // Restore the embedding model that was used to process files
      const currentModelType = embeddingService.getModelInfo().type;
      const savedApiKey = localStorage.getItem(`embedding_api_key_${currentModelType}`);
      if (savedApiKey && currentModelType !== 'simple') {
        embeddingService.setModel(
          currentModelType as 'simple' | 'openai' | 'cohere' | 'mistral' | 'gemini',
          savedApiKey
        );
      }
      
      // Update model info for display
      setEmbeddingModelInfo({
        type: embeddingService.getModelInfo().type,
        dimension: embeddingService.getModelInfo().dimension,
      });
    } catch (error) {
      console.error('Failed to initialize database:', error);
      alert('Failed to initialize database. Please refresh the page.');
    }
  };

  const loadFiles = async () => {
    try {
      const fileList = await indexedDBService.listFiles();
      setFiles(fileList);
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  };

  const handleSearch = useCallback(
    async (query: string, fileId?: string, topK = 5) => {
      try {
        const results = await embeddingService.search(query, fileId, topK);
        return results;
      } catch (error) {
        console.error('Search failed:', error);
        throw error;
      }
    },
    [],
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
