'use client';

import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Bot, Send, Loader2, User, Settings, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import type { FileMetadata } from '~/lib/DataManagement/indexeddb.service';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  sources?: Array<{
    fileId: string;
    fileName: string;
    chunkIndex: number;
    text: string;
    similarity: number;
  }>;
}

interface ChatbotPanelProps {
  files: FileMetadata[];
  onSearch: (
    query: string,
    fileId?: string,
    topK?: number,
  ) => Promise<
    Array<{
      fileId: string;
      chunkIndex: number;
      text: string;
      similarity: number;
    }>
  >;
  currentEmbeddingModel: {
    type: string;
    dimension: number;
  };
}

export function ChatbotPanel({ files, onSearch, currentEmbeddingModel }: ChatbotPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string>('all');
  const [topK, setTopK] = useState<number>(3);
  
  // LLM Configuration - Default to Cohere
  const [selectedLLM, setSelectedLLM] = useState<string>('cohere');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [savedApiKeys, setSavedApiKeys] = useState<Record<string, boolean>>({});
  const [embeddingModelWarning, setEmbeddingModelWarning] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load saved API keys and conversation history on mount
  useEffect(() => {
    const keys: Record<string, boolean> = {};
    ['openai', 'cohere', 'mistral', 'gemini'].forEach((model) => {
      const saved = localStorage.getItem(`embedding_api_key_${model}`);
      if (saved) {
        keys[model] = true;
      }
    });
    setSavedApiKeys(keys);
    
    // Load API key for initially selected LLM
    const saved = localStorage.getItem(`embedding_api_key_${selectedLLM}`);
    if (saved) {
      setApiKey(saved);
    }

    // Load conversation history
    const savedHistory = localStorage.getItem('chatbot_conversation_history');
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        setMessages(parsedHistory);
      } catch (error) {
        console.error('Failed to load conversation history:', error);
      }
    }
  }, []);

  // Load saved API key when LLM selection changes
  useEffect(() => {
    const saved = localStorage.getItem(`embedding_api_key_${selectedLLM}`);
    if (saved) {
      setApiKey(saved);
    } else {
      setApiKey('');
    }
  }, [selectedLLM]);

  // Check if files were processed (show warning if no embeddings)
  useEffect(() => {
    const filesWithEmbeddings = files.filter((f) => f.hasEmbeddings);
    const unprocessedFiles = files.filter((f) => !f.hasEmbeddings);
    
    if (files.length === 0) {
      setEmbeddingModelWarning(
        '⚠️ No files uploaded. Please upload files in the Data Management section first.'
      );
    } else if (filesWithEmbeddings.length === 0) {
      setEmbeddingModelWarning(
        `⚠️ No processed files found. You have ${unprocessedFiles.length} uploaded file(s) that need to be processed. Please go to Data Management and click "Process" on each file to generate embeddings.`
      );
    } else if (unprocessedFiles.length > 0) {
      setEmbeddingModelWarning(
        `✓ ${filesWithEmbeddings.length} file(s) processed and ready. You have ${unprocessedFiles.length} unprocessed file(s) - process them in Data Management to include in chatbot responses.`
      );
    } else {
      setEmbeddingModelWarning('');
    }
  }, [files, currentEmbeddingModel]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save conversation history to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chatbot_conversation_history', JSON.stringify(messages));
    }
  }, [messages]);

  const llmInfo = {
    openai: {
      name: 'OpenAI GPT-4',
      model: 'gpt-4o-mini',
      requiresKey: true,
    },
    cohere: {
      name: 'Cohere Command',
      model: 'command-a-03-2025',
      requiresKey: true,
    },
    mistral: {
      name: 'Mistral Large',
      model: 'mistral-large-latest',
      requiresKey: true,
    },
    gemini: {
      name: 'Google Gemini',
      model: 'gemini-1.5-flash',
      requiresKey: true,
    },
  };

  const getFileName = (fileId: string) => {
    return files.find((f) => f.id === fileId)?.name || 'Unknown';
  };

  // Simple markdown parser for formatting
  const renderMarkdown = (text: string) => {
    // Split by markdown patterns while preserving them
    const parts = text.split(/(\*\*.*?\*\*)/g);
    
    return parts.map((part, index) => {
      // Check if this part is bold markdown
      if (part.startsWith('**') && part.endsWith('**')) {
        const content = part.slice(2, -2);
        return <strong key={index}>{content}</strong>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const currentLLM = llmInfo[selectedLLM as keyof typeof llmInfo];
    if (currentLLM.requiresKey && !apiKey.trim()) {
      alert(`Please enter your ${currentLLM.name} API key`);
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Step 1: Retrieve relevant context from embeddings (search all files, top 5)
      const searchResults = await onSearch(
        userMessage.content,
        undefined, // Search all files
        5, // Get top 5 most relevant chunks
      );

      console.log('🔍 Search results:', searchResults.length, 'chunks found');
      if (searchResults.length > 0) {
        console.log('Top result similarity:', searchResults[0].similarity);
        console.log('Top result text preview:', searchResults[0].text.substring(0, 100));
      }

      // Format context for LLM
      const context = searchResults
        .map((result, idx) => {
          const fileName = getFileName(result.fileId);
          return `[Source ${idx + 1}: ${fileName} - Chunk ${result.chunkIndex} (similarity: ${result.similarity.toFixed(2)})]\n${result.text}`;
        })
        .join('\n\n');

      // Get unique file names with their highest similarity score
      const fileScores = new Map<string, number>();
      searchResults.forEach((result) => {
        const fileName = getFileName(result.fileId);
        const currentScore = fileScores.get(fileName) || 0;
        if (result.similarity > currentScore) {
          fileScores.set(fileName, result.similarity);
        }
      });

      // Sort files by similarity (highest first) and get unique file names
      const sourceFileNames = Array.from(fileScores.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([fileName]) => fileName);

      // Check if we found any relevant context
      if (searchResults.length === 0) {
        const noContextMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `I couldn't find any relevant information in your uploaded documents to answer this question.\n\n**Tip:** Make sure your documents contain information related to "${userMessage.content}"\n\nTry:\n- Asking more specific questions\n- Using keywords that appear in your documents\n- Checking if the right files are processed`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, noContextMessage]);
        setIsLoading(false);
        return;
      }

      // Step 2: Call LLM with context
      const llmResponse = await callLLM(
        selectedLLM,
        apiKey,
        userMessage.content,
        context,
        sourceFileNames,
      );

      // Create sources list with only the highest matching file
      const topSource = searchResults.length > 0 ? searchResults[0] : null;
      
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: llmResponse,
        timestamp: Date.now(),
        sources: topSource ? [{
          ...topSource,
          fileName: getFileName(topSource.fileId),
        }] : [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to generate response'}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    if (confirm('Clear all messages?')) {
      setMessages([]);
      localStorage.removeItem('chatbot_conversation_history');
    }
  };

  return (
    <div className="flex h-[calc(100vh-200px)] flex-col space-y-2">
      {/* Header with Settings Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            Model: {currentEmbeddingModel.type.toUpperCase()} | LLM: {llmInfo[selectedLLM as keyof typeof llmInfo].name}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </div>

      {/* Persistent Warning Banner (shown only when NO files are processed) */}
      {files.filter(f => f.hasEmbeddings).length === 0 && files.length > 0 && !showSettings && (
        <div className="rounded-lg border border-orange-300 bg-orange-50 p-3 text-xs text-orange-800">
          <p className="font-semibold">⚠️ Documents need processing</p>
          <p className="mt-1">Upload files and click "Process" in Data Management to enable chatbot responses.</p>
          <Link 
            href="/home/DataManagement" 
            className="mt-2 inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium underline"
          >
            Go to Data Management <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Settings Panel (Collapsible) */}
      {showSettings && (
        <div className="space-y-3 rounded-lg border bg-gray-50 border border-gray-300 p-4">
          {/* Warning Banner */}
          {embeddingModelWarning && (
            <div className="rounded-lg border border-orange-300 bg-orange-50 p-3 text-xs text-orange-800">
              <p>{embeddingModelWarning}</p>
              {files.filter(f => !f.hasEmbeddings).length > 0 && (
                <Link 
                  href="/home/DataManagement" 
                  className="mt-2 inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium underline"
                >
                  Go to Data Management <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          )}

          {/* Embedding Model Info */}
          <div className="rounded-lg border bg-blue-50 p-3 text-xs">
            <p className="font-semibold text-blue-900">
              📊 Embedding Model: {currentEmbeddingModel.type.toUpperCase()} ({currentEmbeddingModel.dimension}D)
            </p>
            <p className="text-blue-700">
              Documents were processed with this model.
            </p>
          </div>

          {/* LLM Configuration */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="llm-select" className="text-xs">Language Model</Label>
              <Select value={selectedLLM} onValueChange={setSelectedLLM}>
                <SelectTrigger id="llm-select" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(llmInfo).map(([key, info]) => (
                    <SelectItem key={key} value={key}>
                      {info.name} {savedApiKeys[key] ? '✓' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {llmInfo[selectedLLM as keyof typeof llmInfo].requiresKey && (
              <div>
                <Label htmlFor="llm-api-key" className="text-xs">
                  API Key {savedApiKeys[selectedLLM] ? '✓ Saved' : ''}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="llm-api-key"
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={
                      savedApiKeys[selectedLLM]
                        ? 'Using saved key'
                        : 'Enter API key'
                    }
                    className="h-9 text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? 'Hide' : 'Show'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto rounded-lg border bg-gray-100 border border-gray-300 p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-400">
            <div className="text-center">
              <Bot className="mx-auto mb-2 h-12 w-12" />
              <p>Ask questions about your documents</p>
              <p className="text-sm">
                Responses are generated using RAG with your embeddings
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white">
                  <Bot className="h-5 w-5" />
                </div>
              )}
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-gray-600 text-white'
                    : 'bg-gray-50 border border-gray-300 text-gray-800'
                }`}
              >
                <div className="whitespace-pre-wrap">{renderMarkdown(message.content)}</div>
                {message.sources && message.sources.length > 0 && message.sources[0] && (
                  <div className="mt-2 border-t pt-2 text-xs text-gray-500">
                    <p className="font-semibold">
                      📄 Source: {message.sources[0].fileName}
                    </p>
                  </div>
                )}
              </div>
              {message.role === 'user' && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-600 text-white">
                  <User className="h-5 w-5" />
                </div>
              )}
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white">
              <Bot className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-300 p-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-gray-600">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask a question about your documents..."
          disabled={isLoading}
        />
        <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
        {messages.length > 0 && (
          <Button onClick={clearChat} variant="outline" disabled={isLoading}>
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}

async function callLLM(
  provider: string,
  apiKey: string,
  query: string,
  context: string,
  sourceFiles: string[],
): Promise<string> {
  const systemPrompt = `You are an intelligent maintenance assistant for a GMAO (Gestion de Maintenance Assistée par Ordinateur) system.

Your role is to:
- Help users understand and manage maintenance operations
- Answer questions about equipment, procedures, and documentation
- Provide step-by-step guidance for maintenance tasks
- Analyze maintenance data and suggest improvements
- Ensure safety and compliance with procedures

When answering:
1. Be precise and technical when needed
2. Cite specific documents or procedures when available
3. Prioritize safety and best practices
4. Ask clarifying questions if needed
5. Provide actionable recommendations.`;

  const userPrompt = `Context from documents:
${context}

Question: ${query}`;

  let response: string;
  
  switch (provider) {
    case 'openai':
      response = await callOpenAI(apiKey, systemPrompt, userPrompt);
      break;
    case 'cohere':
      response = await callCohere(apiKey, systemPrompt, userPrompt);
      break;
    case 'mistral':
      response = await callMistral(apiKey, systemPrompt, userPrompt);
      break;
    case 'gemini':
      response = await callGemini(apiKey, systemPrompt, userPrompt);
      break;
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }

  // Append source files if any were used
  

  return response;
}

async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'No response generated';
}

async function callCohere(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const response = await fetch('https://api.cohere.ai/v1/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'command-a-03-2025',
      message: userPrompt,
      preamble: systemPrompt,
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Cohere API error: ${error.message || response.statusText}`);
  }

  const data = await response.json();
  return data.text || 'No response generated';
}

async function callMistral(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'mistral-large-latest',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Mistral API error: ${error.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'No response generated';
}

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${systemPrompt}\n\n${userPrompt}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      }),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated'
  );
}


