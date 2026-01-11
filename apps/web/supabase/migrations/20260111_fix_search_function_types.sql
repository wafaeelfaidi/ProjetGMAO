/*
 * -------------------------------------------------------
 * Fix Search Function Type Mismatch
 * The search_documents function expects TEXT but the 
 * uploaded_files.name column is VARCHAR(500)
 * -------------------------------------------------------
 */

-- Drop existing functions first (required when changing return types)
DROP FUNCTION IF EXISTS public.search_documents(vector(1536), FLOAT, INT, UUID, UUID);
DROP FUNCTION IF EXISTS public.hybrid_search_documents(TEXT, vector(1536), FLOAT, INT, UUID);
DROP FUNCTION IF EXISTS public.get_rag_context(vector(1536), INT, FLOAT);

-- Fix the search_documents function to cast VARCHAR to TEXT
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
        f.name::TEXT as file_name,
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

-- Also fix hybrid_search_documents function
CREATE OR REPLACE FUNCTION public.hybrid_search_documents(
    query_text TEXT,
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.5,
    match_count INT DEFAULT 10,
    filter_file_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    file_id UUID,
    file_name TEXT,
    chunk_index INT,
    content TEXT,
    similarity FLOAT,
    text_rank FLOAT,
    combined_score FLOAT,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH semantic_results AS (
        SELECT 
            e.id,
            e.file_id,
            f.name::TEXT as file_name,
            e.chunk_index,
            e.text as content,
            1 - (e.embedding <=> query_embedding) as similarity,
            ts_rank(to_tsvector('english', e.text), plainto_tsquery('english', query_text)) as text_rank,
            e.metadata
        FROM public.file_embeddings e
        JOIN public.uploaded_files f ON e.file_id = f.id
        WHERE 
            e.embedding IS NOT NULL
            AND (filter_file_id IS NULL OR e.file_id = filter_file_id)
            AND (e.user_id = auth.uid() OR public.is_admin())
    )
    SELECT 
        sr.id,
        sr.file_id,
        sr.file_name,
        sr.chunk_index,
        sr.content,
        sr.similarity,
        sr.text_rank,
        (0.7 * sr.similarity + 0.3 * LEAST(sr.text_rank, 1.0))::FLOAT as combined_score,
        sr.metadata
    FROM semantic_results sr
    WHERE sr.similarity > match_threshold
       OR sr.text_rank > 0.1
    ORDER BY (0.7 * sr.similarity + 0.3 * LEAST(sr.text_rank, 1.0)) DESC
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also fix get_rag_context function
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
        f.name::TEXT as file_name,
        e.text as chunk_text,
        1 - (e.embedding <=> query_embedding) as similarity,
        jsonb_build_object(
            'file_id', e.file_id,
            'chunk_index', e.chunk_index,
            'document_type', f.document_type
        ) as source_info
    FROM public.file_embeddings e
    JOIN public.uploaded_files f ON e.file_id = f.id
    WHERE 
        e.embedding IS NOT NULL
        AND (1 - (e.embedding <=> query_embedding)) > min_similarity
        AND (e.user_id = auth.uid() OR public.is_admin())
    ORDER BY e.embedding <=> query_embedding
    LIMIT max_chunks;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.search_documents(vector(1536), FLOAT, INT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hybrid_search_documents(TEXT, vector(1536), FLOAT, INT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_rag_context(vector(1536), INT, FLOAT) TO authenticated;
