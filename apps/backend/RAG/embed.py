from openai import OpenAI
import tiktoken

client = OpenAI()

def chunk_text(text, max_tokens=500):
    tokenizer = tiktoken.get_encoding("cl100k_base")
    tokens = tokenizer.encode(text)
    for i in range(0, len(tokens), max_tokens):
        yield tokenizer.decode(tokens[i:i+max_tokens])

def create_embeddings(text):
    chunks = list(chunk_text(text))
    embeddings = []
    for chunk in chunks:
        response = client.embeddings.create(
            input=chunk,
            model="text-embedding-3-small"
        )
        embeddings.append({
            "text": chunk,
            "embedding": response.data[0].embedding
        })
    return embeddings
