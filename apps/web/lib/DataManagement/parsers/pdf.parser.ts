/**
 * PDF Parser using pdf.js
 */

export async function parsePdf(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    
    // Use jsdelivr CDN with correct URL format
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
    }
    
    return fullText.trim();
  } catch (error) {
    throw new Error(`Failed to parse PDF file: ${error}`);
  }
}

/**
 * Alternative: Server-side PDF parsing via API route
 */
export async function parsePdfViaApi(fileId: string): Promise<string> {
  const response = await fetch(`/api/data-section/parse-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId }),
  });

  if (!response.ok) {
    throw new Error('Failed to parse PDF via API');
  }

  const data = await response.json();
  return data.text;
}
