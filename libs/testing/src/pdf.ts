import { extractText, getDocumentProxy } from 'unpdf';

/** The text a reader would copy out of a PDF, pages joined, whitespace collapsed. */
export async function pdfText(buffer: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text.replace(/\s+/g, ' ').trim();
}
