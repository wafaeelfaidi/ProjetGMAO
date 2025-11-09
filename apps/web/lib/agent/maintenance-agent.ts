/**
 * Autonomous AI agent for GMAO maintenance system.
 * Provides intelligent assistance with RAG, reasoning, and tool use.
 */

import { getCohereClient } from "../cohere/client";
import { getVectorStore } from "../vector-store/local-store";
import { addItem, getItemsByIndex, STORES, getItem } from "../client-storage/indexed-db";
import type { ChatMessage, StoredDocument } from "../client-storage/indexed-db";

// Simple UUID generator
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface AgentConfig {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  useRAG?: boolean;
  topK?: number;
  similarityThreshold?: number;
}

export interface AgentResponse {
  message: string;
  sources?: string[]; // Document IDs
  sourceNames?: string[]; // Document file names for display
  reasoning?: string;
}

const DEFAULT_SYSTEM_PROMPT = `You are an intelligent maintenance assistant for a GMAO (Gestion de Maintenance Assistée par Ordinateur) system.

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
5. Provide actionable recommendations

If you reference information from documents, mention the source clearly.`;

/**
 * Autonomous AI Agent
 */
export class MaintenanceAgent {
  private config: AgentConfig;
  private userId: string;

  constructor(userId: string, config: Partial<AgentConfig> = {}) {
    this.userId = userId;
    this.config = {
      systemPrompt: config.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
      temperature: config.temperature ?? 0.3,
      maxTokens: config.maxTokens ?? 2000,
      useRAG: config.useRAG ?? true,
      topK: config.topK ?? 15, // Increased from 5 to 10 for more context
      similarityThreshold: config.similarityThreshold ?? 0.35, // Lowered from 0.5 to 0.3 for better recall
    };
  }

  /**
   * Process a user query with optional RAG
   */
  async processQuery(query: string): Promise<AgentResponse> {
    const cohereClient = getCohereClient();
    if (!cohereClient) {
      throw new Error("Cohere API key not set");
    }

    let contextDocuments: string[] | undefined;
    let sources: string[] | undefined;
    let sourceNames: string[] | undefined;

    // Retrieve relevant context if RAG is enabled
    if (this.config.useRAG) {
      const retrievalResult = await this.retrieveContext(query);
      contextDocuments = retrievalResult.documents;
      sources = retrievalResult.sources;
      
      // Get document names for display
      if (sources && sources.length > 0) {
        sourceNames = await this.getDocumentNames(sources);
      }
    }

    // Generate response using preamble and documents parameters
    const response = await cohereClient.chat(
      query,
      contextDocuments,
      {
        model: "command-a-03-2025",
        temperature: this.config.temperature ?? 0.3,
        maxTokens: this.config.maxTokens ?? 2000,
        preamble: this.config.systemPrompt,
      }
    );

    // Store message in history with document references
    await this.storeMessage("user", query);
    await this.storeMessage("assistant", response, sources);

    return {
      message: response,
      sources,
      sourceNames,
    };
  }

  /**
   * Retrieve relevant context from vector store
   */
  private async retrieveContext(query: string): Promise<{
    documents: string[];
    sources: string[];
  }> {
    const cohereClient = getCohereClient();
    if (!cohereClient) {
      console.log("[RAG] No Cohere client available");
      return { documents: [], sources: [] };
    }

    const vectorStore = getVectorStore();

    // Create query embedding
    console.log("[RAG] Creating query embedding for:", query.substring(0, 50) + "...");
    const [queryEmbedding] = await cohereClient.embed([query], {
      inputType: "search_query",
    });

    if (!queryEmbedding) {
      console.log("[RAG] Failed to create query embedding");
      return { documents: [], sources: [] };
    }

    console.log("[RAG] Query embedding created, dimension:", queryEmbedding.length);

    // Search for similar chunks
    const results = await vectorStore.search(
      queryEmbedding,
      this.userId,
      this.config.topK ?? 15,
      this.config.similarityThreshold ?? 0.35
    );

    console.log(`[RAG] Found ${results.length} relevant chunks`);
    if (results.length > 0) {
      console.log("[RAG] Top result similarity:", results[0]?.similarity);
      console.log("[RAG] Top result preview:", results[0]?.text.substring(0, 100) + "...");
    } else {
      console.warn("[RAG] No relevant chunks found! Check if documents are processed.");
    }

    // Return documents as array of strings for Cohere's documents parameter
    const documents = results.map((r) => r.text);
    const sources = [...new Set(results.map((r) => r.documentId))];

    console.log(`[RAG] Using ${documents.length} chunks from ${sources.length} document(s)`);

    return { documents, sources };
  }

  /**
   * Get document names from document IDs
   */
  private async getDocumentNames(documentIds: string[]): Promise<string[]> {
    const names: string[] = [];
    
    for (const docId of documentIds) {
      try {
        const doc = await getItem<StoredDocument>(STORES.DOCUMENTS, docId);
        if (doc) {
          names.push(doc.fileName);
        }
      } catch (error) {
        console.error(`Failed to get document name for ${docId}:`, error);
      }
    }
    
    return names;
  }

  /**
   * Store message in chat history
   */
  private async storeMessage(
    role: "user" | "assistant",
    content: string,
    documentIds?: string[]
  ): Promise<void> {
    const message: ChatMessage = {
      id: generateUUID(),
      userId: this.userId,
      role,
      content,
      timestamp: Date.now(),
      documentIds,
    };

    await addItem(STORES.CHAT_HISTORY, message);
  }

  /**
   * Get chat history for the user
   */
  async getChatHistory(limit?: number): Promise<ChatMessage[]> {
    const messages = await getItemsByIndex<ChatMessage>(
      STORES.CHAT_HISTORY,
      "userId",
      this.userId
    );

    // Sort by timestamp (newest first)
    messages.sort((a, b) => b.timestamp - a.timestamp);

    if (limit) {
      return messages.slice(0, limit).reverse();
    }

    return messages.reverse();
  }

  /**
   * Clear chat history
   */
  async clearHistory(): Promise<void> {
    const messages = await this.getChatHistory();
    
    // Delete each message
    // Note: This is not efficient for large histories
    // Consider adding a bulk delete function to indexed-db.ts
    for (const message of messages) {
      await deleteItem(STORES.CHAT_HISTORY, message.id);
    }
  }

  /**
   * Get agent statistics
   */
  async getStats(): Promise<{
    messageCount: number;
    documentCount: number;
    embeddingCount: number;
  }> {
    const vectorStore = getVectorStore();
    const messages = await this.getChatHistory();
    const stats = await vectorStore.getStats(this.userId);

    return {
      messageCount: messages.length,
      documentCount: stats.uniqueDocuments,
      embeddingCount: stats.totalEmbeddings,
    };
  }
}

// Import deleteItem function
import { deleteItem } from "../client-storage/indexed-db";
