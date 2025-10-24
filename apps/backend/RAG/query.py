from supabase import create_client
import os
import cohere

url = os.environ["SUPABASE_URL"]
key = os.environ["SUPABASE_SERVICE_KEY"]
supabase = create_client(url, key)
COHERE_API_KEY = os.getenv("COHERE_API_KEY")
co = cohere.Client(COHERE_API_KEY)

def query_context(user_id, query):
    # Gemini does not provide direct embeddings. Use Vertex AI or other service if needed.
    # For now, just use the query text for matching.
    embedding = get_query_embedding(query)
    response = supabase.rpc(
        "match_documents",
        {"query_embedding": embedding, "match_count": 5, "user_id": user_id}
    ).execute()

    return " ".join([doc["text"] for doc in response.data])

def get_query_embedding(query):
    response = co.embed(texts=[query], model="embed-english-v3.0", input_type="search_query")
    return response.embeddings[0]
