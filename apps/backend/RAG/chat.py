import cohere
import os

COHERE_API_KEY = os.getenv("COHERE_API_KEY")
co = cohere.Client(COHERE_API_KEY)

def generate_answer(context, query):
    prompt = f"""
    You are a maintenance AI assistant. Use the provided context from technical documents
    to answer user questions accurately.

    Context:
    {context}

    Question:
    {query}
    """
    response = co.chat(
        model="command-a-03-2025",
        message=prompt,
        max_tokens=256,
        temperature=0.3
    )
    return response.text.strip()
