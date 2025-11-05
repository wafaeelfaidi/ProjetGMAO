from supabase import create_client, Client
import os

url = os.environ["SUPABASE_URL"]
key = os.environ["SUPABASE_SERVICE_KEY"]
supabase: Client = create_client(url, key)

def store_embeddings(embeddings, user_id):
    rows = [
        {
            "user_id": user_id,
            "text": e["text"],
            "embedding": e["embedding"]
        }
        for e in embeddings
    ]
    supabase.table("documents").insert(rows).execute()
