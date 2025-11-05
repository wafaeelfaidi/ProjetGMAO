import cohere
import os
from dotenv import load_dotenv
load_dotenv()
COHERE_API_KEY = os.getenv("COHERE_API_KEY")
co = cohere.Client(COHERE_API_KEY)

def chunk_text(text, max_tokens=500):
    for i in range(0, len(text), max_tokens):
        yield text[i:i+max_tokens]

def create_embeddings(text):
    chunks = list(chunk_text(text))
    response = co.embed(texts=chunks, model="embed-english-v3.0", input_type="search_document")
    embeddings = []
    for chunk, embedding in zip(chunks, response.embeddings):
        embeddings.append({
            "text": chunk,
            "embedding": embedding
        })
    return embeddings
