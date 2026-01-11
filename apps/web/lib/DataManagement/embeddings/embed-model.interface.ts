/**
 * Modular Embedding Interface
 * 
 * This interface allows easy swapping of embedding models
 * without changing the core embedding logic
 */

export interface EmbedModel {
  /**
   * Embed a single text string
   * @returns Vector representation as array of numbers
   */
  embedText(text: string): Promise<number[]>;

  /**
   * Embed multiple text strings in batch
   * @returns Array of vector representations
   */
  embedBatch(texts: string[]): Promise<number[][]>;

  /**
   * Get the dimension of the embedding vectors
   */
  getDimension(): number;

  /**
   * Get the model name/identifier
   */
  getModelName(): string;
}

/**
 * Default embedding model using a simple TF-IDF-like approach
 * This is a placeholder - in production you would use:
 * - OpenAI Embeddings API
 * - Cohere Embeddings API
 * - Local models via Transformers.js
 * - Sentence Transformers via API
 */
export class SimpleEmbedModel implements EmbedModel {
  private dimension: number = 384; // Common embedding dimension
  private vocabulary: Map<string, number> = new Map();

  getDimension(): number {
    return this.dimension;
  }

  getModelName(): string {
    return 'simple-tfidf-embeddings';
  }

  async embedText(text: string): Promise<number[]> {
    // Simple word frequency embedding (placeholder)
    const words = this.tokenize(text);
    const vector = new Array(this.dimension).fill(0);

    // Build simple frequency-based vector
    words.forEach((word) => {
      const hash = this.hashWord(word);
      const index = hash % this.dimension;
      vector[index] += 1;
    });

    // Normalize
    const magnitude = Math.sqrt(
      vector.reduce((sum, val) => sum + val * val, 0),
    );
    return magnitude > 0 ? vector.map((v) => v / magnitude) : vector;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((text) => this.embedText(text)));
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 0);
  }

  private hashWord(word: string): number {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      const char = word.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}

/**
 * OpenAI Embeddings Model
 * Requires OPENAI_API_KEY environment variable
 */
export class OpenAIEmbedModel implements EmbedModel {
  private apiKey: string;
  private model: string = 'text-embedding-3-small';
  private dimension: number = 1536;

  constructor(apiKey?: string, model?: string) {
    this.apiKey =
      apiKey || process.env.NEXT_PUBLIC_OPENAI_API_KEY || 'NOT_SET';
    if (model) this.model = model;
  }

  getDimension(): number {
    return this.dimension;
  }

  getModelName(): string {
    return this.model;
  }

  async embedText(text: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        input: text,
        model: this.model,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        input: texts,
        model: this.model,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.map((item: any) => item.embedding);
  }
}

/**
 * Cohere Embeddings Model
 * Requires COHERE_API_KEY environment variable
 */
export class CohereEmbedModel implements EmbedModel {
  private apiKey: string;
  private model: string = 'embed-english-v3.0';
  private dimension: number = 1024;

  constructor(apiKey?: string, model?: string) {
    this.apiKey =
      apiKey || process.env.NEXT_PUBLIC_COHERE_API_KEY || 'NOT_SET';
    if (model) this.model = model;
  }

  getDimension(): number {
    return this.dimension;
  }

  getModelName(): string {
    return this.model;
  }

  async embedText(text: string): Promise<number[]> {
    const response = await fetch('https://api.cohere.ai/v1/embed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        texts: [text],
        model: this.model,
        input_type: 'search_document',
      }),
    });

    if (!response.ok) {
      throw new Error(`Cohere API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.embeddings[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await fetch('https://api.cohere.ai/v1/embed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        texts: texts,
        model: this.model,
        input_type: 'search_document',
      }),
    });

    if (!response.ok) {
      throw new Error(`Cohere API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.embeddings;
  }
}

/**
 * Mistral Embeddings Model
 */
export class MistralEmbedModel implements EmbedModel {
  private apiKey: string;
  private model: string = 'mistral-embed';
  private dimension: number = 1024;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || '';
    if (model) this.model = model;
  }

  getDimension(): number {
    return this.dimension;
  }

  getModelName(): string {
    return this.model;
  }

  async embedText(text: string): Promise<number[]> {
    const response = await fetch('https://api.mistral.ai/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        input: [text],
        model: this.model,
      }),
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await fetch('https://api.mistral.ai/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        input: texts,
        model: this.model,
      }),
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.map((item: any) => item.embedding);
  }
}

/**
 * Google Gemini Embeddings Model
 */
export class GeminiEmbedModel implements EmbedModel {
  private apiKey: string;
  private model: string = 'text-embedding-004';
  private dimension: number = 768;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || '';
    if (model) this.model = model;
  }

  getDimension(): number {
    return this.dimension;
  }

  getModelName(): string {
    return this.model;
  }

  async embedText(text: string): Promise<number[]> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:embedContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: {
            parts: [{ text }],
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.embedding.values;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    // Gemini doesn't support batch, so we do sequential
    return Promise.all(texts.map((text) => this.embedText(text)));
  }
}

/**
 * Factory function to create embedding model based on configuration
 */
export function createEmbedModel(
  modelType: 'simple' | 'openai' | 'cohere' | 'mistral' | 'gemini' = 'simple',
  apiKey?: string,
): EmbedModel {
  switch (modelType) {
    case 'openai':
      return new OpenAIEmbedModel(apiKey);
    case 'cohere':
      return new CohereEmbedModel(apiKey);
    case 'mistral':
      return new MistralEmbedModel(apiKey);
    case 'gemini':
      return new GeminiEmbedModel(apiKey);
    case 'simple':
    default:
      return new SimpleEmbedModel();
  }
}
