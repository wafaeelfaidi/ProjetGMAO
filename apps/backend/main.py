from fastapi import FastAPI, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from RAG.extract import extract_text_from_file
from RAG.embed import create_embeddings
from RAG.store import store_embeddings
from RAG.query import query_context
from RAG.chat import generate_answer

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/process_document")
async def process_document(file_url: str = Form(...), user_id: str = Form(...)):
    import uuid
    try:
        user_uuid = str(uuid.UUID(user_id))
    except Exception:
        return {"error": "Invalid user_id. Must be a valid UUID."}

    # 1. Download file from Supabase
    text = await extract_text_from_file(file_url)

    # 2. Embed and store
    embeddings = create_embeddings(text)
    store_embeddings(embeddings, user_uuid)

    return {"status": "ok", "chunks": len(embeddings)}


@app.post("/chat")
async def chat_with_docs(user_id: str = Form(...), query: str = Form(...)):
    import uuid
    try:
        user_uuid = str(uuid.UUID(user_id))
    except Exception:
        return {"error": "Invalid user_id. Must be a valid UUID."}

    # 1. Retrieve context from user’s docs
    context = query_context(user_uuid, query)

    # 2. Generate LLM answer
    answer = generate_answer(context, query)

    return {"answer": answer}
