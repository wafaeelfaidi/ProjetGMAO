/**
 * Client-side Cohere API integration.
 * User provides their own API key which is stored in-memory only.
 */

const COHERE_API_URL = "https://api.cohere.ai/v1";

export interface CohereConfig {
  apiKey: string;
}

export interface EmbedOptions {
  model?: string;
  inputType?: "search_document" | "search_query" | "classification" | "clustering";
  truncate?: "NONE" | "START" | "END";
}

export interface ChatMessage {
  role: "USER" | "CHATBOT";
  message: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  preamble?: string;
  chatHistory?: ChatMessage[];
}

export interface EmbedResponse {
  embeddings: number[][];
  meta: {
    api_version: {
      version: string;
    };
  };
}

export interface ChatResponse {
  text: string;
  generation_id: string;
  citations?: any[];
  documents?: any[];
  search_results?: any[];
  search_queries?: any[];
}

/**
 * Cohere client for client-side API calls
 */
export class CohereClient {
  private apiKey: string;

  constructor(config: CohereConfig) {
    this.apiKey = config.apiKey;
  }

  /**
   * Create embeddings for text chunks
   */
  async embed(
    texts: string[],
    options: EmbedOptions = {}
  ): Promise<number[][]> {
    const {
      model = "embed-english-v3.0",
      inputType = "search_document",
      truncate = "END",
    } = options;

    const response = await fetch(`${COHERE_API_URL}/embed`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        texts,
        model,
        input_type: inputType,
        truncate,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Cohere embed error: ${error.message || response.statusText}`);
    }

    const data: EmbedResponse = await response.json();
    return data.embeddings;
  }

  /**
   * Generate chat response with optional context and chat history
   */
  async chat(
    message: string,
    context?: string[],
    options: ChatOptions = {}
  ): Promise<string> {
    const {
      model = "command-r",
      temperature = 0.3,
      maxTokens = 2000,
      preamble,
      chatHistory,
    } = options;

    const requestBody: any = {
      message,
      model,
      temperature,
      max_tokens: maxTokens,
    };

    if (preamble) {
      requestBody.preamble = preamble;
    }

    if (context && context.length > 0) {
      // Use documents parameter for RAG context
      requestBody.documents = context.map((text, idx) => ({
        id: `doc_${idx}`,
        text,
      }));
    }

    if (chatHistory && chatHistory.length > 0) {
      // Include conversation history for context
      requestBody.chat_history = chatHistory;
    }

    const response = await fetch(`${COHERE_API_URL}/chat`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Cohere chat error: ${error.message || response.statusText}`);
    }

    const data: ChatResponse = await response.json();
    return data.text;
  }

  /**
   * Validate API key by making a test request
   */
  async validateKey(): Promise<boolean> {
    try {
      await this.embed(["test"], { inputType: "search_query" });
      return true;
    } catch (error) {
      console.error("Cohere API key validation failed:", error);
      return false;
    }
  }
}

/**
 * In-memory storage for user's API key with optional localStorage persistence
 */
let cohereClient: CohereClient | null = null;

export function setCohereApiKey(apiKey: string, persist: boolean = false): void {
  cohereClient = new CohereClient({ apiKey });
  
  // Optionally save to localStorage (encrypted)
  if (persist && typeof window !== "undefined") {
    import("./secure-storage").then(({ saveApiKey }) => {
      saveApiKey(apiKey).catch(console.error);
    });
  }
}

export function getCohereClient(): CohereClient | null {
  return cohereClient;
}

export function clearCohereApiKey(): void {
  cohereClient = null;
  
  // Clear from localStorage
  if (typeof window !== "undefined") {
    import("./secure-storage").then(({ clearApiKey }) => {
      clearApiKey();
    });
  }
}

export function hasCohereApiKey(): boolean {
  return cohereClient !== null;
}

/**
 * Attempt to restore API key from localStorage on app load
 */
export async function restoreApiKey(): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }
  
  try {
    const { loadApiKey } = await import("./secure-storage");
    const apiKey = await loadApiKey();
    
    if (apiKey) {
      cohereClient = new CohereClient({ apiKey });
      return true;
    }
  } catch (error) {
    console.error("Failed to restore API key:", error);
  }
  
  return false;
}
