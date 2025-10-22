import tempfile
import requests
from PyPDF2 import PdfReader
from docx import Document

async def extract_text_from_file(file_url: str) -> str:
    response = requests.get(file_url)
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        tmp.write(response.content)
        tmp_path = tmp.name

    if file_url.endswith(".pdf"):
        reader = PdfReader(tmp_path)
        return "\n".join([page.extract_text() or "" for page in reader.pages])

    elif file_url.endswith(".docx"):
        doc = Document(tmp_path)
        return "\n".join([p.text for p in doc.paragraphs])

    else:
        return open(tmp_path, "r", encoding="utf-8").read()
