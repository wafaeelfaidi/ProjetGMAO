/*
 * -------------------------------------------------------
 * Add Vector Embeddings for RAG (Retrieval Augmented Generation)
 * This migration adds:
 * - pgvector extension for vector similarity search
 * - Enhanced file_embeddings table with vector support
 * - Document processing metadata
 * - Functions for semantic search
 * -------------------------------------------------------
 */

-- =====================================================
-- SECTION 1: Enable pgvector Extension
-- =====================================================

-- Enable the pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- Grant usage on vector type
GRANT USAGE ON TYPE vector TO authenticated;

-- =====================================================
-- SECTION 2: Update file_embeddings table for vector support
-- =====================================================

-- Drop the existing vector column if it's REAL[]
ALTER TABLE public.file_embeddings 
DROP COLUMN IF EXISTS vector;

-- Add proper vector column with pgvector
-- Using 1536 dimensions to support various models:
-- - Simple: 384 dims (will be padded)
-- - OpenAI text-embedding-3-small: 1536 dims
-- - OpenAI text-embedding-ada-002: 1536 dims
-- - Cohere embed-english-v3.0: 1024 dims
-- Can be adjusted based on the embedding model used
ALTER TABLE public.file_embeddings 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Add file_path for storage bucket (replaces file_data BYTEA)
ALTER TABLE public.uploaded_files
ADD COLUMN IF NOT EXISTS file_path TEXT;

-- Drop old file_data column if it exists
ALTER TABLE public.uploaded_files
DROP COLUMN IF EXISTS file_data;

-- Add document type for different processing strategies
ALTER TABLE public.uploaded_files
ADD COLUMN IF NOT EXISTS document_type VARCHAR(50);

-- Add processing metadata
ALTER TABLE public.uploaded_files
ADD COLUMN IF NOT EXISTS processing_status VARCHAR(50) DEFAULT 'pending';

ALTER TABLE public.uploaded_files
ADD COLUMN IF NOT EXISTS processing_error TEXT;

ALTER TABLE public.uploaded_files
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Create index for vector similarity search using HNSW (Hierarchical Navigable Small World)
-- This is more efficient for high-dimensional vectors
CREATE INDEX IF NOT EXISTS idx_file_embeddings_embedding 
ON public.file_embeddings 
USING hnsw (embedding vector_cosine_ops);

-- Create GIN index for text search on chunk text
CREATE INDEX IF NOT EXISTS idx_file_embeddings_text 
ON public.file_embeddings 
USING gin (to_tsvector('english', text));

-- =====================================================
-- SECTION 3: Document Processing Type Functions
-- =====================================================

-- Function to determine document type from file extension
CREATE OR REPLACE FUNCTION public.get_document_type(file_name TEXT, mime_type TEXT)
RETURNS VARCHAR(50) AS $$
BEGIN
    -- Check file extension first
    IF file_name ILIKE '%.pdf' THEN
        RETURN 'pdf';
    ELSIF file_name ILIKE '%.docx' OR file_name ILIKE '%.doc' THEN
        RETURN 'docx';
    ELSIF file_name ILIKE '%.txt' THEN
        RETURN 'txt';
    ELSIF file_name ILIKE '%.md' OR file_name ILIKE '%.markdown' THEN
        RETURN 'markdown';
    ELSIF file_name ILIKE '%.csv' THEN
        RETURN 'csv';
    ELSIF file_name ILIKE '%.xlsx' OR file_name ILIKE '%.xls' THEN
        RETURN 'excel';
    ELSIF file_name ILIKE '%.json' THEN
        RETURN 'json';
    ELSIF file_name ILIKE '%.xml' THEN
        RETURN 'xml';
    ELSIF file_name ILIKE '%.html' OR file_name ILIKE '%.htm' THEN
        RETURN 'html';
    END IF;
    
    -- Fallback to MIME type
    IF mime_type LIKE 'application/pdf' THEN
        RETURN 'pdf';
    ELSIF mime_type LIKE '%wordprocessingml%' THEN
        RETURN 'docx';
    ELSIF mime_type LIKE 'text/plain' THEN
        RETURN 'txt';
    ELSIF mime_type LIKE 'text/csv' THEN
        RETURN 'csv';
    ELSIF mime_type LIKE '%spreadsheetml%' THEN
        RETURN 'excel';
    ELSIF mime_type LIKE 'application/json' THEN
        RETURN 'json';
    ELSIF mime_type LIKE 'application/xml' OR mime_type LIKE 'text/xml' THEN
        RETURN 'xml';
    ELSIF mime_type LIKE 'text/html' THEN
        RETURN 'html';
    END IF;
    
    RETURN 'unknown';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to auto-set document type on insert/update
CREATE OR REPLACE FUNCTION public.set_document_type()
RETURNS TRIGGER AS $$
BEGIN
    NEW.document_type = public.get_document_type(NEW.name, NEW.type);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS set_uploaded_files_document_type ON public.uploaded_files;

-- Create trigger to auto-set document type
CREATE TRIGGER set_uploaded_files_document_type
    BEFORE INSERT OR UPDATE ON public.uploaded_files
    FOR EACH ROW
    EXECUTE FUNCTION public.set_document_type();

-- =====================================================
-- SECTION 4: Vector Search Functions
-- =====================================================

-- Function for semantic search using cosine similarity
CREATE OR REPLACE FUNCTION public.search_documents(
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5,
    filter_file_id UUID DEFAULT NULL,
    filter_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    file_id UUID,
    file_name TEXT,
    chunk_index INT,
    content TEXT,
    similarity FLOAT,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.file_id,
        f.name as file_name,
        e.chunk_index,
        e.text as content,
        1 - (e.embedding <=> query_embedding) as similarity,
        e.metadata
    FROM public.file_embeddings e
    JOIN public.uploaded_files f ON e.file_id = f.id
    WHERE 
        e.embedding IS NOT NULL
        AND (1 - (e.embedding <=> query_embedding)) > match_threshold
        AND (filter_file_id IS NULL OR e.file_id = filter_file_id)
        AND (filter_user_id IS NULL OR e.user_id = filter_user_id)
        AND (e.user_id = auth.uid() OR public.is_admin())
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for hybrid search (combining semantic and keyword search)
CREATE OR REPLACE FUNCTION public.hybrid_search_documents(
    query_text TEXT,
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5,
    filter_file_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    file_id UUID,
    file_name TEXT,
    chunk_index INT,
    content TEXT,
    semantic_similarity FLOAT,
    keyword_rank FLOAT,
    combined_score FLOAT,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH semantic_results AS (
        SELECT 
            e.id,
            e.file_id,
            f.name as file_name,
            e.chunk_index,
            e.text as content,
            1 - (e.embedding <=> query_embedding) as similarity,
            e.metadata
        FROM public.file_embeddings e
        JOIN public.uploaded_files f ON e.file_id = f.id
        WHERE 
            e.embedding IS NOT NULL
            AND (filter_file_id IS NULL OR e.file_id = filter_file_id)
            AND (e.user_id = auth.uid() OR public.is_admin())
    ),
    keyword_results AS (
        SELECT 
            e.id,
            ts_rank(to_tsvector('english', e.text), plainto_tsquery('english', query_text)) as rank
        FROM public.file_embeddings e
        WHERE 
            to_tsvector('english', e.text) @@ plainto_tsquery('english', query_text)
            AND (filter_file_id IS NULL OR e.file_id = filter_file_id)
            AND (e.user_id = auth.uid() OR public.is_admin())
    )
    SELECT 
        s.id,
        s.file_id,
        s.file_name,
        s.chunk_index,
        s.content,
        s.similarity as semantic_similarity,
        COALESCE(k.rank, 0) as keyword_rank,
        (s.similarity * 0.7 + COALESCE(k.rank, 0) * 0.3) as combined_score,
        s.metadata
    FROM semantic_results s
    LEFT JOIN keyword_results k ON s.id = k.id
    WHERE s.similarity > match_threshold OR k.rank > 0
    ORDER BY combined_score DESC
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get documents for RAG context
CREATE OR REPLACE FUNCTION public.get_rag_context(
    query_embedding vector(1536),
    max_chunks INT DEFAULT 5,
    min_similarity FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    file_name TEXT,
    chunk_text TEXT,
    similarity FLOAT,
    source_info JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.name as file_name,
        e.text as chunk_text,
        1 - (e.embedding <=> query_embedding) as similarity,
        jsonb_build_object(
            'file_id', e.file_id,
            'chunk_index', e.chunk_index,
            'uploaded_at', f.upload_date,
            'file_type', f.document_type
        ) as source_info
    FROM public.file_embeddings e
    JOIN public.uploaded_files f ON e.file_id = f.id
    WHERE 
        e.embedding IS NOT NULL
        AND (1 - (e.embedding <=> query_embedding)) >= min_similarity
        AND (e.user_id = auth.uid() OR public.is_admin())
        AND f.has_embeddings = true
    ORDER BY e.embedding <=> query_embedding
    LIMIT max_chunks;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SECTION 5: Document Statistics Functions
-- =====================================================

-- Function to get document statistics
CREATE OR REPLACE FUNCTION public.get_document_stats()
RETURNS TABLE (
    total_documents BIGINT,
    total_embeddings BIGINT,
    documents_by_type JSONB,
    processing_status_counts JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT f.id) as total_documents,
        COUNT(e.id) as total_embeddings,
        jsonb_object_agg(
            COALESCE(f.document_type, 'unknown'), 
            COUNT(DISTINCT f.id)
        ) FILTER (WHERE f.document_type IS NOT NULL) as documents_by_type,
        jsonb_object_agg(
            f.processing_status,
            COUNT(*)
        ) as processing_status_counts
    FROM public.uploaded_files f
    LEFT JOIN public.file_embeddings e ON f.id = e.file_id
    WHERE f.user_id = auth.uid() OR public.is_admin()
    GROUP BY ();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SECTION 6: Grant Permissions
-- =====================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.get_document_type(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_documents(vector(1536), FLOAT, INT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hybrid_search_documents(TEXT, vector(1536), FLOAT, INT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_rag_context(vector(1536), INT, FLOAT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_document_stats() TO authenticated;

-- =====================================================
-- SECTION 7: Add helpful comments
-- =====================================================

COMMENT ON COLUMN public.file_embeddings.embedding IS 'Vector embedding for semantic search using pgvector (1536 dimensions, supports multiple models)';
COMMENT ON COLUMN public.uploaded_files.document_type IS 'Auto-detected document type for processing strategy selection';
COMMENT ON COLUMN public.uploaded_files.processing_status IS 'Status: pending, processing, completed, failed';
COMMENT ON FUNCTION public.search_documents IS 'Semantic search using vector similarity (cosine distance)';
COMMENT ON FUNCTION public.hybrid_search_documents IS 'Hybrid search combining semantic vectors and keyword matching';
COMMENT ON FUNCTION public.get_rag_context IS 'Get relevant document chunks for RAG (Retrieval Augmented Generation)';
COMMENT ON FUNCTION public.get_document_stats IS 'Get statistics about uploaded documents and embeddings';
