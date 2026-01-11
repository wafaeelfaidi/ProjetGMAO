/**
 * Main export for embeddings module
 */

export { createEmbedModel } from './embed-model.interface';
export type { EmbedModel } from './embed-model.interface';
export {
  CohereEmbedModel,
  GeminiEmbedModel,
  MistralEmbedModel,
  OpenAIEmbedModel,
  SimpleEmbedModel,
} from './embed-model.interface';
export { embeddingService, EmbeddingService } from './embedding.service';
export type {
  EmbeddingConfig,
  EmbeddingProgress,
  ProgressCallback,
} from './embedding.service';
