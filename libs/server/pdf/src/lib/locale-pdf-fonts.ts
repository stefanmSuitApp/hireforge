import { Font } from '@react-pdf/renderer';

let registerAttempted = false;
let bodyFontFamily: 'NotoSans' | 'Helvetica' = 'Helvetica';

/**
 * Registers Noto Sans (Latin extended, Cyrillic, etc.) for @react-pdf PDFs.
 * Use for invoices, proformas, CVs, and any doc that may contain Serbian Latin / Cyrillic.
 * Falls back to built-in Helvetica if registration fails (offline, blocked fetch, etc.).
 */
export function registerLocalePdfFonts(): void {
  if (registerAttempted) return;
  registerAttempted = true;
  try {
    Font.register({
      family: 'NotoSans',
      fonts: [
        {
          src: 'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf',
          fontWeight: 400,
        },
        {
          src: 'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Bold.ttf',
          fontWeight: 700,
        },
      ],
    });
    bodyFontFamily = 'NotoSans';
  } catch {
    bodyFontFamily = 'Helvetica';
  }
}

export function localePdfBodyFontFamily(): 'NotoSans' | 'Helvetica' {
  return bodyFontFamily;
}

/** Bold heading / label styles (Helvetica-Bold vs Noto Sans 700). */
export function localePdfBoldStyle(
  extras: Record<string, string | number> = {},
): Record<string, string | number> {
  if (bodyFontFamily === 'NotoSans') {
    return { fontFamily: 'NotoSans', fontWeight: 700, ...extras };
  }
  return { fontFamily: 'Helvetica-Bold', ...extras };
}
