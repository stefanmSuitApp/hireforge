// The CV builder's template picker falls back to `public/cv-templates/<code>.png`
// (rendered by `pnpm cv:previews`); every template needs one.
import { existsSync } from 'node:fs';
import path from 'node:path';

import { cvTemplateCodes } from 'contracts';
import { describe, expect, it } from 'vitest';

const DIR = path.resolve(__dirname, '../../public/cv-templates');

describe('CV template thumbnails', () => {
  it.each(cvTemplateCodes)('%s has a picker thumbnail', (code) => {
    expect(existsSync(path.join(DIR, `${code}.png`))).toBe(true);
  });
});
