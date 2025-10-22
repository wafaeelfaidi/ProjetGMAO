from fastapi import FastAPI, UploadFile, Form
from rag.extract import extract_text_from_file
from rag.embed import create_embeddings
from rag.store import store_embeddings
from rag.query import query_context
from rag.chat import generate_answer

app = FastAPI()

@app.post("/process_document")
async def process_document(file_url: str = Form(...), user_id: str = Form(...)):
    # 1. Download file from Supabase
    text = await extract_text_from_file(file_url)

    # 2. Embed and store
    embeddings = create_embeddings(text)
    store_embeddings(embeddings, user_id)

    return {"status": "ok", "chunks": len(embeddings)}


@app.post("/chat")
async def chat_with_docs(user_id: str = Form(...), query: str = Form(...)):
    # 1. Retrieve context from user’s docs
    context = query_context(user_id, query)

    # 2. Generate LLM answer
    answer = generate_answer(context, query)

    return {"answer": answer}
