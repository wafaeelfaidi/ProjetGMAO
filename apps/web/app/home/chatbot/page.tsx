"use client";
import { useState, useEffect, useRef } from "react";
import { useSupabaseSession } from "~/lib/supabase/use-session";
import { Send, MessageCircle, User, Bot, Settings, Trash2 } from "lucide-react";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ApiKeyManager } from "~/components/api-key-manager";
import { MaintenanceAgent } from "~/lib/agent/maintenance-agent";
import { hasCohereApiKey, restoreApiKey } from "~/lib/cohere/client";
import { getVectorStore } from "~/lib/vector-store/local-store";


interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: string[];
}

export default function ChatPage() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { session, loading } = useSupabaseSession();
  const agentRef = useRef<MaintenanceAgent | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize agent when session and API key are available
  useEffect(() => {
    const initialize = async () => {
      // Try to restore API key first
      if (!hasCohereApiKey()) {
        await restoreApiKey();
      }
      
      if (session?.user?.id && hasCohereApiKey()) {
        agentRef.current = new MaintenanceAgent(session.user.id);
        setHasApiKey(true);
        
        // Load chat history
        loadChatHistory();
        
        // Log vector store stats for debugging
        try {
          const vectorStore = getVectorStore();
          const stats = await vectorStore.getStats(session.user.id);
          console.log(`[Chatbot] Vector store stats:`, stats);
          console.log(`[Chatbot] - Total embeddings: ${stats.totalEmbeddings}`);
          console.log(`[Chatbot] - Unique documents: ${stats.uniqueDocuments}`);
          if (stats.totalEmbeddings === 0) {
            console.warn("[Chatbot] No embeddings found! Process some documents in the Data Upload page.");
          }
        } catch (error) {
          console.error("[Chatbot] Failed to get vector store stats:", error);
        }
      }
    };
    
    initialize();
  }, [session]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadChatHistory = async () => {
    if (!agentRef.current) return;
    
    try {
      const history = await agentRef.current.getChatHistory(50);
      setMessages(history.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
      })));
    } catch (error) {
      console.error("Failed to load chat history:", error);
    }
  };

  const sendQuery = async () => {
    if (!session?.user?.id) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Please log in to use the chatbot. Redirecting to sign-in...",
        timestamp: new Date()
      }]);
      window.location.href = "/auth/sign-in?next=/home/chatbot";
      return;
    }

    if (!hasApiKey || !agentRef.current) {
      setShowSettings(true);
      return;
    }

    if (!query.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    const currentQuery = query;
    setQuery("");

    try {
      const response = await agentRef.current.processQuery(currentQuery);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        sources: response.sources,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error instanceof Error 
          ? `Error: ${error.message}` 
          : "An error occurred. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuery();
    }
  };

  const handleApiKeySet = () => {
    setHasApiKey(true);
    setShowSettings(false);
    
    // Initialize agent if session is available
    if (session?.user?.id) {
      agentRef.current = new MaintenanceAgent(session.user.id);
      loadChatHistory();
    }
  };

  const clearChat = async () => {
    if (!agentRef.current) return;
    
    const confirmed = window.confirm("Are you sure you want to clear all chat history? This cannot be undone.");
    if (!confirmed) return;
    
    try {
      await agentRef.current.clearHistory();
      setMessages([]);
      console.log("[Chatbot] Chat history cleared");
    } catch (error) {
      console.error("Failed to clear chat history:", error);
      alert("Failed to clear chat history. Please try again.");
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-slate-600">Loading...</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center">
              <MessageCircle className="w-8 h-8 mr-3 text-blue-600" />
              AI Maintenance Assistant
            </h1>
            <p className="text-slate-600">
              Powered by Cohere • All data stored locally
            </p>
          </div>
          <div className="flex gap-2">
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="p-2 hover:bg-red-100 rounded-lg transition-colors group"
                title="Clear chat history"
              >
                <Trash2 className="w-6 h-6 text-slate-600 group-hover:text-red-600" />
              </button>
            )}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-6 h-6 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-6">
            <ApiKeyManager onKeySet={handleApiKeySet} />
          </div>
        )}

        {/* API Key Required Notice */}
        {!hasApiKey && !showSettings && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">
              ⚠️ API key required. Click the{" "}
              <button
                onClick={() => setShowSettings(true)}
                className="underline font-semibold"
              >
                settings icon
              </button>{" "}
              to configure.
            </p>
          </div>
        )}

        {/* Chat Container */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Messages Area */}
          <div className="h-[500px] min-h-[220px] overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-slate-500 py-12">
                <Bot className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p className="text-lg font-medium mb-2">Welcome to AI Maintenance Assistant</p>
                <p className="text-sm mb-4">Ask questions about your technical documents</p>
                <div className="text-xs text-slate-400 space-y-1">
                  <p>✓ All data stored locally in your browser</p>
                  <p>✓ No server processing - fully client-side</p>
                  <p>✓ Your API key never leaves your device</p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-900"
                    }`}
                  >
                    <div className="flex items-center mb-1">
                      {message.role === "user" ? (
                        <User className="w-4 h-4 mr-2" />
                      ) : (
                        <Bot className="w-4 h-4 mr-2" />
                      )}
                      <span className="text-xs opacity-75">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {message.role === "assistant" ? (
                      <div className="prose prose-sm text-slate-900">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                        {message.sources && message.sources.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-300">
                            <p className="text-xs text-slate-600">
                              📄 Sources: {message.sources.length} document(s)
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 text-slate-900 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                  <div className="flex items-center">
                    <Bot className="w-4 h-4 mr-2" />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-200 p-6">
            <div className="flex space-x-4">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={hasApiKey ? "Ask your question..." : "Configure API key first..."}
                className="flex-1 border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                disabled={isLoading || !hasApiKey}
              />
              <button
                onClick={sendQuery}
                disabled={isLoading || !query.trim() || !hasApiKey}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg disabled:shadow-none flex items-center"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Info Footer */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-blue-800">
            <strong>💡 Tip:</strong> Upload documents first to get contextual answers. All processing happens locally in your browser.
          </p>
        </div>
      </div>
    </div>
  );
}
