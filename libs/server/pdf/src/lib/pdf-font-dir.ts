import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Where the bundled PDF fonts are on the server: in the lib source for dev
 * and tests, next to the API bundle in the image (webpack copies them to
 * `assets/fonts`). `PDF_FONT_DIR` overrides.
 */
export function pdfFontDir(): string {
  const candidates = [
    process.env['PDF_FONT_DIR'],
    // Source first: a local `dist` can be an older build.
    path.join(__dirname, '../fonts'),
    path.join(process.cwd(), 'libs/server/pdf/src/fonts'),
    path.join(process.cwd(), 'dist/apps/api/assets/fonts'),
    path.join(__dirname, 'assets/fonts'),
  ].filter((dir): dir is string => Boolean(dir));
  const dir = candidates.find((d) =>
    existsSync(path.join(d, 'NotoSans-Regular.ttf')),
  );
  if (!dir) {
    throw new Error(`PDF fonts not found in: ${candidates.join(', ')}`);
  }
  return dir;
}
