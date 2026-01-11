/**
 * Text Parser for TXT files
 */

export async function parseTxt(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    // Try UTF-8 first
    const decoder = new TextDecoder('utf-8');
    let text = decoder.decode(arrayBuffer);

    // Check if it contains replacement characters (wrong encoding)
    if (text.includes('�')) {
      // Try Latin-1 encoding
      const latin1Decoder = new TextDecoder('iso-8859-1');
      text = latin1Decoder.decode(arrayBuffer);
    }

    return text.trim();
  } catch (error) {
    throw new Error(`Failed to parse TXT file: ${error}`);
  }
}
