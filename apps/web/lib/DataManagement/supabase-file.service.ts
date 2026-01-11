/**
 * Supabase File Storage Service
 * Uses Supabase Storage for file storage and database for metadata
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const STORAGE_BUCKET = 'documents'; // Storage bucket name

export interface FileMetadata {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadDate: string;
  isProcessed: boolean;
  hasEmbeddings: boolean;
  isPublic: boolean;
}

export interface StoredFile extends FileMetadata {
  filePath: string;
  data: ArrayBuffer; // File data loaded from storage
  userId: string;
  accountId: string;
  metadata?: Record<string, any>;
}

export interface Embedding {
  id: string;
  fileId: string;
  chunkIndex: number;
  text: string;
  vector: number[];
  createdAt: string;
  userId: string;
  accountId: string;
}

/**
 * Supabase File Service class
 */
export class SupabaseFileService {
  private bucketInitialized = false;

  constructor(private client: SupabaseClient) {}

  /**
   * Check if storage bucket exists
   * Note: This is a soft check - if we can't verify, we proceed anyway
   * and let the actual file operations fail if there's a real problem
   */
  private async ensureBucket(): Promise<void> {
    if (this.bucketInitialized) return;

    try {
      // Try to check if bucket exists
      const { data: buckets, error } = await this.client.storage.listBuckets();
      
      if (error) {
        // Can't list buckets (might be RLS), but proceed anyway
        console.warn('⚠️ Could not verify bucket existence:', error.message);
        console.log('Proceeding anyway - file operations will fail if bucket is missing');
        this.bucketInitialized = true;
        return;
      }

      const bucketExists = buckets?.some(b => b.name === STORAGE_BUCKET);

      if (bucketExists) {
        console.log(`✅ Storage bucket '${STORAGE_BUCKET}' verified`);
      } else {
        console.warn(`⚠️ Storage bucket '${STORAGE_BUCKET}' not found in list`);
        console.log('Proceeding anyway - it may exist but not be listable');
      }

      this.bucketInitialized = true;
    } catch (error) {
      // If check fails, proceed anyway - actual operations will fail if bucket missing
      console.warn('⚠️ Could not check bucket existence:', error);
      console.log('Proceeding anyway - file operations will fail if bucket is missing');
      this.bucketInitialized = true;
    }
  }

  /**
   * Store a file in Supabase Storage
   */
  async storeFile(file: File, isPublic: boolean = false): Promise<string> {
    await this.ensureBucket();

    console.log('🔍 storeFile called with:', { fileName: file.name, isPublic });

    // Get current user
    const { data: userData, error: userError } = await this.client.auth.getUser();
    if (userError || !userData.user) {
      throw new Error('User not authenticated');
    }

    const userId = userData.user.id;
    const accountId = userData.user.id;

    // Create unique file path
    const fileId = crypto.randomUUID();
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${userId}/${timestamp}_${sanitizedName}`;

    // Upload file to storage
    const { error: uploadError } = await this.client.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    console.log('📝 Inserting to database with is_public:', isPublic);

    // Create database record
    const { error: insertError } = await this.client
      .from('uploaded_files')
      .insert({
        id: fileId,
        user_id: userId,
        account_id: accountId,
        name: file.name,
        type: file.type,
        size: file.size,
        file_path: filePath,
        is_processed: false,
        has_embeddings: false,
        is_public: isPublic,
        metadata: {},
      });

    if (insertError) {
      // Rollback: delete uploaded file
      await this.client.storage.from(STORAGE_BUCKET).remove([filePath]);
      console.error('Error storing file metadata:', insertError);
      throw new Error(`Failed to store file metadata: ${insertError.message}`);
    }

    console.log('✅ File stored successfully:', filePath, 'isPublic:', isPublic);
    return fileId;
  }

  /**
   * Get all files (metadata only)
   */
  async listFiles(): Promise<FileMetadata[]> {
    const { data, error } = await this.client
      .from('uploaded_files')
      .select('id, name, type, size, upload_date, is_processed, has_embeddings, is_public')
      .order('upload_date', { ascending: false });

    if (error) {
      console.error('Error listing files:', error);
      throw new Error(`Failed to list files: ${error.message}`);
    }

    return (data || []).map((file) => ({
      id: file.id,
      name: file.name,
      type: file.type,
      size: file.size,
      uploadDate: file.upload_date,
      isProcessed: file.is_processed,
      hasEmbeddings: file.has_embeddings,
      isPublic: file.is_public || false,
    }));
  }

  /**
   * Get a specific file with its binary data from storage
   */
  async getFile(id: string): Promise<StoredFile | null> {
    const { data, error } = await this.client
      .from('uploaded_files')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error getting file metadata:', error);
      return null;
    }

    if (!data) return null;

    // Download file from storage
    const { data: fileBlob, error: downloadError } = await this.client.storage
      .from(STORAGE_BUCKET)
      .download(data.file_path);

    if (downloadError) {
      console.error('Error downloading file:', downloadError);
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    // Convert Blob to ArrayBuffer
    const arrayBuffer = await fileBlob.arrayBuffer();
    console.log('✅ File downloaded successfully, size:', arrayBuffer.byteLength);

    return {
      id: data.id,
      name: data.name,
      type: data.type,
      size: data.size,
      uploadDate: data.upload_date,
      isProcessed: data.is_processed,
      hasEmbeddings: data.has_embeddings,
      filePath: data.file_path,
      data: arrayBuffer,
      userId: data.user_id,
      accountId: data.account_id,
      metadata: data.metadata || {},
    };
  }

  /**
   * Update file metadata
   */
  async updateFileMetadata(
    id: string,
    updates: Partial<Pick<FileMetadata, 'isProcessed' | 'hasEmbeddings' | 'isPublic'>> & { metadata?: Record<string, any> }
  ): Promise<void> {
    const updateData: any = {};
    
    if (updates.isProcessed !== undefined) {
      updateData.is_processed = updates.isProcessed;
      updateData.processing_status = updates.isProcessed ? 'completed' : 'processing';
    }
    
    if (updates.hasEmbeddings !== undefined) {
      updateData.has_embeddings = updates.hasEmbeddings;
      if (updates.hasEmbeddings) {
        updateData.processed_at = new Date().toISOString();
      }
    }

    if (updates.isPublic !== undefined) {
      updateData.is_public = updates.isPublic;
    }

    if (updates.metadata) {
      updateData.metadata = updates.metadata;
    }

    const { error } = await this.client
      .from('uploaded_files')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Error updating file metadata:', error);
      throw new Error(`Failed to update file: ${error.message}`);
    }
  }

  /**
   * Store embeddings for a file (now using pgvector)
   */
  async storeEmbeddings(embeddings: Omit<Embedding, 'id' | 'userId' | 'accountId' | 'createdAt'>[]): Promise<void> {
    // Get current user
    const { data: userData, error: userError } = await this.client.auth.getUser();
    if (userError || !userData.user) {
      throw new Error('User not authenticated');
    }

    const userId = userData.user.id;
    const accountId = userData.user.id;

    // Format vectors for pgvector (convert array to string format)
    const embeddingsToInsert = embeddings.map((embedding) => ({
      id: crypto.randomUUID(),
      file_id: embedding.fileId,
      user_id: userId,
      account_id: accountId,
      chunk_index: embedding.chunkIndex,
      text: embedding.text,
      // Ensure vector is exactly 1536 dimensions
      embedding: embedding.vector.length === 1536 
        ? embedding.vector 
        : embedding.vector.length < 1536
          ? [...embedding.vector, ...new Array(1536 - embedding.vector.length).fill(0)]
          : embedding.vector.slice(0, 1536),
    }));

    // Insert embeddings
    const { error } = await this.client
      .from('file_embeddings')
      .insert(embeddingsToInsert);

    if (error) {
      console.error('Error storing embeddings:', error);
      throw new Error(`Failed to store embeddings: ${error.message}`);
    }

    // Update file to mark as processed
    if (embeddings.length > 0 && embeddings[0]) {
      const fileId = embeddings[0].fileId;
      await this.client
        .from('uploaded_files')
        .update({ 
          has_embeddings: true,
          is_processed: true 
        })
        .eq('id', fileId);
    }
  }

  /**
   * Delete a file and its embeddings
   */
  async deleteFile(id: string): Promise<void> {
    // Get file path first
    const { data: fileData } = await this.client
      .from('uploaded_files')
      .select('file_path')
      .eq('id', id)
      .single();

    // Delete embeddings first (due to foreign key constraint)
    const { error: embeddingsError } = await this.client
      .from('file_embeddings')
      .delete()
      .eq('file_id', id);

    if (embeddingsError) {
      console.error('Error deleting embeddings:', embeddingsError);
      throw new Error(`Failed to delete embeddings: ${embeddingsError.message}`);
    }

    // Delete database record
    const { error: dbError } = await this.client
      .from('uploaded_files')
      .delete()
      .eq('id', id);

    if (dbError) {
      console.error('Error deleting file record:', dbError);
      throw new Error(`Failed to delete file: ${dbError.message}`);
    }

    // Delete from storage
    if (fileData?.file_path) {
      const { error: storageError } = await this.client.storage
        .from(STORAGE_BUCKET)
        .remove([fileData.file_path]);

      if (storageError) {
        console.warn('Failed to delete file from storage:', storageError);
        // Don't throw - metadata is already deleted
      }
    }

    console.log('✅ File deleted successfully');
  }

  /**
   * Get embeddings for a specific file
   */
  async getEmbeddings(fileId: string): Promise<Embedding[]> {
    const { data, error } = await this.client
      .from('file_embeddings')
      .select('*')
      .eq('file_id', fileId)
      .order('chunk_index', { ascending: true });

    if (error) {
      console.error('Error getting embeddings:', error);
      throw new Error(`Failed to get embeddings: ${error.message}`);
    }

    return (data || []).map((emb) => ({
      id: emb.id,
      fileId: emb.file_id,
      chunkIndex: emb.chunk_index,
      text: emb.text,
      vector: typeof emb.embedding === 'string' 
        ? JSON.parse(emb.embedding.replace(/\[|\]/g, '').split(',').map((v: string) => parseFloat(v)))
        : emb.embedding || [],
      createdAt: emb.created_at,
      userId: emb.user_id,
      accountId: emb.account_id,
    }));
  }

  /**
   * Vector search using pgvector similarity
   */
  async vectorSearch(
    queryVector: number[],
    options: {
      fileId?: string;
      topK?: number;
      threshold?: number;
    } = {}
  ): Promise<Array<{
    fileId: string;
    fileName: string;
    chunkIndex: number;
    text: string;
    similarity: number;
  }>> {
    const { fileId, topK = 5, threshold = 0.7 } = options;

    // Format query vector for pgvector
    const vectorString = `[${queryVector.join(',')}]`;

    // Build RPC call to search function
    const { data, error } = await this.client.rpc('search_documents', {
      query_embedding: vectorString,
      match_threshold: threshold,
      match_count: topK,
      filter_file_id: fileId || null,
      filter_user_id: null,
    });

    if (error) {
      const errorMessage = error.message || error.code || JSON.stringify(error) || 'Unknown error';
      console.error('Error performing vector search:', errorMessage, error.details || '', error.hint || '');
      throw new Error(`Vector search failed: ${errorMessage}`);
    }

    return (data || []).map((result: any) => ({
      fileId: result.file_id,
      fileName: result.file_name,
      chunkIndex: result.chunk_index,
      text: result.content,
      similarity: result.similarity,
    }));
  }

  /**
   * Get RAG context using vector search
   */
  async getRagContext(
    queryVector: number[],
    maxChunks: number = 5,
    minSimilarity: number = 0.7
  ): Promise<Array<{
    fileName: string;
    chunkText: string;
    similarity: number;
    sourceInfo: any;
  }>> {
    const vectorString = `[${queryVector.join(',')}]`;

    const { data, error } = await this.client.rpc('get_rag_context', {
      query_embedding: vectorString,
      max_chunks: maxChunks,
      min_similarity: minSimilarity,
    });

    if (error) {
      console.error('Error getting RAG context:', error);
      throw new Error(`Failed to get RAG context: ${error.message}`);
    }

    return (data || []).map((result: any) => ({
      fileName: result.file_name,
      chunkText: result.chunk_text,
      similarity: result.similarity,
      sourceInfo: result.source_info,
    }));
  }

  /**
   * Get all embeddings (for statistics)
   */
  async getAllEmbeddings(): Promise<Embedding[]> {
    const { data, error } = await this.client
      .from('file_embeddings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting all embeddings:', error);
      throw new Error(`Failed to get embeddings: ${error.message}`);
    }

    return (data || []).map((emb) => ({
      id: emb.id,
      fileId: emb.file_id,
      chunkIndex: emb.chunk_index,
      text: emb.text,
      vector: emb.vector,
      createdAt: emb.created_at,
      userId: emb.user_id,
      accountId: emb.account_id,
    }));
  }

  /**
   * Get total count of embeddings
   */
  async getEmbeddingsCount(): Promise<number> {
    const { count, error } = await this.client
      .from('file_embeddings')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Error getting embeddings count:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Clear all data (for testing/reset)
   */
  async clearAll(): Promise<void> {
    // Get all file paths
    const { data: files } = await this.client
      .from('uploaded_files')
      .select('file_path');

    // Delete all embeddings
    const { error: embeddingsError } = await this.client
      .from('file_embeddings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (embeddingsError) {
      console.error('Error clearing embeddings:', embeddingsError);
    }

    // Delete all file records
    const { error: filesError } = await this.client
      .from('uploaded_files')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (filesError) {
      console.error('Error clearing files:', filesError);
    }

    // Delete all files from storage
    if (files && files.length > 0) {
      const paths = files.map(f => f.file_path).filter(Boolean);
      if (paths.length > 0) {
        const { error: storageError } = await this.client.storage
          .from(STORAGE_BUCKET)
          .remove(paths);

        if (storageError) {
          console.warn('Error clearing storage:', storageError);
        }
      }
    }

    console.log('✅ All data cleared');
  }

  /**
   * Initialize (ensures storage bucket exists)
   */
  async initialize(): Promise<void> {
    await this.ensureBucket();
  }
}
