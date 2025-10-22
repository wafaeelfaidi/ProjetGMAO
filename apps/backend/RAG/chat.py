from openai import OpenAI

client = OpenAI()

def generate_answer(context, query):
    prompt = f"""
    You are a maintenance AI assistant. Use the provided context from technical documents
    to answer user questions accurately.

    Context:
    {context}

    Question:
    {query}
    """

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
    )

    return response.choices[0].message.content
