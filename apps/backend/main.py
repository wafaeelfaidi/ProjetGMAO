from fastapi import FastAPI, UploadFile, Form, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import os
from RAG.extract import extract_text_from_file
from RAG.embed import create_embeddings
from RAG.store import store_embeddings
from RAG.query import query_context
from RAG.chat import generate_answer

app = FastAPI()

# Mount a `static/` directory so files like favicon.ico can be served from
# http://<host>/static/favicon.ico. When present we'll also serve /favicon.ico
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

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


@app.get("/")
async def root():
    return {"message": "Backend running. Use POST /process_document and POST /chat."}


@app.get("/favicon.ico")
async def favicon():
    # Prefer a static/favicon.ico shipped with the backend. If not present,
    # return 204 (no content) to silence frequent browser 404 noise.
    favicon_path = os.path.join(os.path.dirname(__file__), "static", "favicon.ico")
    if os.path.exists(favicon_path):
        return FileResponse(favicon_path)
    return Response(status_code=204)


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
