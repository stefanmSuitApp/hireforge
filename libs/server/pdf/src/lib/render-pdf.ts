import { Font, renderToBuffer } from '@react-pdf/renderer';

import {
  PDF_BODY_FONT,
  PDF_SERIF_FONT,
  registerLocalePdfFonts,
} from './locale-pdf-fonts';
import { pdfFontDir } from './pdf-font-dir';

let queue: Promise<unknown> = Promise.resolve();

/**
 * Server render with a freshly loaded body font. fontkit keeps glyph state
 * between documents: after a CV with bold "Š"/"ć", the next CV's bold "S"/"c"
 * lost their text mapping, so copy-paste and CV scanners read "Experiene".
 * One render at a time, so a reload never lands in the middle of another.
 */
export function renderPdfToBuffer(
  document: Parameters<typeof renderToBuffer>[0],
): Promise<Buffer> {
  const run = queue.then(() => {
    registerLocalePdfFonts(pdfFontDir());
    const families = Font.getRegisteredFonts();
    for (const family of [PDF_BODY_FONT, PDF_SERIF_FONT]) {
      for (const source of families[family]?.sources ?? []) {
        source.data = null;
        source.loadResultPromise = null;
      }
    }
    return renderToBuffer(document);
  });
  queue = run.catch(() => undefined);
  return run;
}
