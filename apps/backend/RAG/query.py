from supabase import create_client
import numpy as np
from openai import OpenAI
import os

url = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
supabase = create_client(url, key)
client = OpenAI()

def query_context(user_id, query):
    query_embedding = client.embeddings.create(
        model="text-embedding-3-small",
        input=query
    ).data[0].embedding

    # Use Supabase pgvector similarity search
    response = supabase.rpc(
        "match_documents",  # custom RPC defined below
        {"query_embedding": query_embedding, "match_count": 5, "user_id": user_id}
    ).execute()

    return " ".join([doc["text"] for doc in response.data])
