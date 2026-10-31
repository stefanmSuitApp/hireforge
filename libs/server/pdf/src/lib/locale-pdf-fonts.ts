import { Font } from '@react-pdf/renderer';

/** Noto Sans: Serbian Latin and Cyrillic in every PDF (CVs, invoices). */
export const PDF_BODY_FONT = 'NotoSans';
/** Noto Serif: headings of the classic CV. */
export const PDF_SERIF_FONT = 'NotoSerif';

let registered = false;

/**
 * Registers the bundled Noto Sans from `base`: a directory on the server
 * (`pdfFontDir()`) or a URL path in the browser (`/fonts/pdf`). The files
 * ship with the app, so a render never waits on (or fails with) the network.
 * Call it before rendering; react-pdf keeps one registry per process.
 */
export function registerLocalePdfFonts(base: string): void {
  if (registered) return;
  registered = true;
  // react-pdf hyphenates with English rules ("djord- je@primer.rs"); names,
  // emails and Serbian words must stay whole.
  Font.registerHyphenationCallback((word) => [word]);
  Font.register({
    family: PDF_BODY_FONT,
    fonts: [
      { src: `${base}/NotoSans-Regular.ttf`, fontWeight: 400 },
      { src: `${base}/NotoSans-Bold.ttf`, fontWeight: 700 },
    ],
  });
  Font.register({
    family: PDF_SERIF_FONT,
    fonts: [
      { src: `${base}/NotoSerif-Regular.ttf`, fontWeight: 400 },
      { src: `${base}/NotoSerif-Bold.ttf`, fontWeight: 700 },
      {
        src: `${base}/NotoSerif-Italic.ttf`,
        fontWeight: 400,
        fontStyle: 'italic',
      },
    ],
  });
}

export function localePdfBodyFontFamily(): typeof PDF_BODY_FONT {
  return PDF_BODY_FONT;
}

/** Bold heading / label style (Noto Sans 700). */
export function localePdfBoldStyle(
  extras: Record<string, string | number> = {},
): Record<string, string | number> {
  return { fontFamily: PDF_BODY_FONT, fontWeight: 700, ...extras };
}
