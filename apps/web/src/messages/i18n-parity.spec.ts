import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));

function collectPaths(
  value: unknown,
  prefix: string,
  out: Set<string>,
): void {
  if (value === null || typeof value !== 'object') {
    out.add(prefix || '(root)');
    return;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      collectPaths(value[i], `${prefix}[${i}]`, out);
    }
    return;
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  for (const k of keys) {
    const next = prefix ? `${prefix}.${k}` : k;
    collectPaths((value as Record<string, unknown>)[k], next, out);
  }
}

describe('i18n message parity (sr ↔ en)', () => {
  it('has identical key paths in en.json and sr.json', () => {
    const enPath = join(here, 'en.json');
    const srPath = join(here, 'sr.json');
    const en = JSON.parse(readFileSync(enPath, 'utf8')) as unknown;
    const sr = JSON.parse(readFileSync(srPath, 'utf8')) as unknown;

    const enKeys = new Set<string>();
    const srKeys = new Set<string>();
    collectPaths(en, '', enKeys);
    collectPaths(sr, '', srKeys);

    const missingInSr = [...enKeys].filter((k) => !srKeys.has(k)).sort();
    const missingInEn = [...srKeys].filter((k) => !enKeys.has(k)).sort();

    expect(
      { missingInSr, missingInEn },
      `sr/en message trees diverge. missingInSr=${missingInSr.slice(0, 20).join(', ')} missingInEn=${missingInEn.slice(0, 20).join(', ')}`,
    ).toEqual({ missingInSr: [], missingInEn: [] });
  });
});
