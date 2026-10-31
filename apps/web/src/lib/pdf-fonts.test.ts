// The browser CV preview loads Noto Sans from `public/fonts/pdf`; the server
// renders with the copy in `libs/server/pdf`. They must be the same files or
// the preview and the stored PDF drift apart.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../../../..');
const SERVER = path.join(ROOT, 'libs/server/pdf/src/fonts');
const BROWSER = path.join(ROOT, 'apps/web/public/fonts/pdf');

describe('PDF fonts', () => {
  it('the browser preview serves the same font files the server renders with', () => {
    const files = readdirSync(SERVER).sort();
    expect(readdirSync(BROWSER).sort()).toEqual(files);
    for (const file of files) {
      expect(
        readFileSync(path.join(BROWSER, file)).equals(
          readFileSync(path.join(SERVER, file)),
        ),
        file,
      ).toBe(true);
    }
  });
});
