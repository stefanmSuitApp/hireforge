/**
 * Picker thumbnails: renders the sample candidate with every CV template and
 * saves page 1 as `apps/web/public/cv-templates/<code>.png`. Rerun after
 * changing a template: `pnpm cv:previews` (macOS: uses `sips`).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { cvTemplateCodes } from 'contracts';
import { renderCvPdfBuffer, SAMPLE_CANDIDATE } from 'server-cv-templates';

const OUT = path.resolve('apps/web/public/cv-templates');
const WIDTH = 600;

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const work = mkdtempSync(path.join(tmpdir(), 'cv-previews-'));
  for (const code of cvTemplateCodes) {
    const pdf = path.join(work, `${code}.pdf`);
    writeFileSync(pdf, await renderCvPdfBuffer(code, SAMPLE_CANDIDATE));
    const png = path.join(OUT, `${code}.png`);
    execFileSync(
      'sips',
      [
        '-s',
        'format',
        'png',
        '-Z',
        String((WIDTH * 297) / 210),
        pdf,
        '--out',
        png,
      ],
      {
        stdio: 'ignore',
      },
    );
    console.log(`wrote ${path.relative(process.cwd(), png)}`);
  }
}

void main();
