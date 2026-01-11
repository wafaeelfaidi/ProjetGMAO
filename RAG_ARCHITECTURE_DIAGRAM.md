```mermaid
graph TB
    subgraph "User Interface"
        A[User] --> B[Upload Document]
        A --> C[Search Query]
        A --> D[Ask Question]
    end

    subgraph "Document Processing"
        B --> E{Detect Type}
        E -->|PDF| F1[PDF Processor<br/>Structured Chunking]
        E -->|DOCX| F2[DOCX Processor<br/>Paragraph Chunking]
        E -->|TXT| F3[TXT Processor<br/>Simple Chunking]
        E -->|MD| F4[Markdown Processor<br/>Section Chunking]
        E -->|CSV| F5[CSV Processor<br/>Row Chunking]
        E -->|JSON/XML/HTML| F6[Other Processors<br/>Text Extraction]
        
        F1 --> G[Generate Chunks]
        F2 --> G
        F3 --> G
        F4 --> G
        F5 --> G
        F6 --> G
    end

    subgraph "Embedding Generation"
        G --> H{Embedding Model}
        H -->|Simple| I1[Local Embeddings]
        H -->|OpenAI| I2[OpenAI API]
        H -->|Cohere| I3[Cohere API]
        H -->|Mistral| I4[Mistral API]
        H -->|Gemini| I5[Google API]
        
        I1 --> J[768-dim Vectors]
        I2 --> J
        I3 --> J
        I4 --> J
        I5 --> J
    end

    subgraph "Vector Database (Supabase)"
        J --> K[(uploaded_files)]
        J --> L[(file_embeddings<br/>pgvector)]
        
        L --> M[HNSW Index<br/>Fast Similarity Search]
        L --> N[GIN Index<br/>Keyword Search]
    end

    subgraph "Search & Retrieval"
        C --> O[Embed Query]
        O --> P{Search Type}
        P -->|Semantic| Q[Vector Similarity<br/>Cosine Distance]
        P -->|Hybrid| R[Semantic + Keyword<br/>Combined Score]
        
        Q --> M
        R --> M
        R --> N
        
        M --> S[Top K Results]
        N --> S
    end

    subgraph "RAG Integration"
        D --> T[Embed Question]
        T --> U[Retrieve Context<br/>get_rag_context]
        U --> M
        
        M --> V[Top Chunks<br/>with Sources]
        V --> W[Build Prompt<br/>Context + Question]
        W --> X[AI Model<br/>GPT-4, Claude, etc.]
        X --> Y[Answer with Sources]
    end

    subgraph "Security & Access"
        Z[Row Level Security]
        Z --> K
        Z --> L
        
        AA{User Role}
        AA -->|Admin| AB[Access All]
        AA -->|Operator| AC[Access Own]
        
        AB --> K
        AC --> K
    end

    style A fill:#e1f5ff
    style K fill:#fff4e6
    style L fill:#fff4e6
    style M fill:#e8f5e9
    style Y fill:#f3e5f5
    style Z fill:#ffebee
```

# RAG System Architecture Diagram

## Flow Description

### 1. Document Upload Flow (Blue Path)
1. User uploads document
2. System detects document type (PDF, DOCX, TXT, etc.)
3. Appropriate processor handles the file
4. Text is extracted and chunked using type-specific strategy
5. Chunks are sent to embedding generation

### 2. Embedding Generation (Yellow Path)
1. Each chunk is processed by selected embedding model
2. Models support: Local, OpenAI, Cohere, Mistral, Gemini
3. Generates 768-dimensional vectors
4. Vectors stored in Supabase with metadata

### 3. Storage (Orange Area)
1. **uploaded_files**: Stores file metadata and binary data
2. **file_embeddings**: Stores text chunks with vector embeddings
3. **HNSW Index**: Fast approximate nearest neighbor search
4. **GIN Index**: Full-text keyword search

### 4. Search Flow (Green Path)
1. User enters search query
2. Query is embedded using same model
3. Two search types available:
   - **Semantic**: Pure vector similarity (cosine distance)
   - **Hybrid**: Combines semantic and keyword matching
4. Returns top K most relevant results

### 5. RAG Flow (Purple Path)
1. User asks a question
2. Question is embedded
3. System retrieves most relevant chunks from database
4. Context is assembled with source information
5. Prompt is built: System instruction + Context + Question
6. Sent to AI model (GPT-4, Claude, etc.)
7. AI responds with answer citing sources

### 6. Security (Red Area)
1. Row Level Security (RLS) enforces access control
2. Admins can access all documents
3. Operators can only access their own documents
4. Policies applied at database level

## Key Technologies

- **pgvector**: PostgreSQL extension for vector operations
- **HNSW**: Hierarchical Navigable Small World index
- **Supabase**: Backend as a Service with PostgreSQL
- **TypeScript**: Type-safe implementation
- **React**: Frontend UI components

## Performance Features

- **HNSW Indexing**: O(log n) approximate search
- **Batch Processing**: Insert embeddings in batches
- **Lazy Loading**: Initialize services on demand
- **Caching**: Reuse embedding service instances
- **Filtered Queries**: Reduce search space

## Supported Document Types

1. **PDF** - Portable Document Format
2. **DOCX** - Microsoft Word
3. **TXT** - Plain Text
4. **MD** - Markdown
5. **CSV** - Comma-Separated Values
6. **JSON** - JavaScript Object Notation
7. **XML** - Extensible Markup Language
8. **HTML** - HyperText Markup Language
