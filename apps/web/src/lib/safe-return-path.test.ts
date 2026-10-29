import { describe, expect, it } from 'vitest';

import { isSafeReturnPath } from './safe-return-path';

describe('isSafeReturnPath', () => {
  it('accepts paths on this site', () => {
    expect(isSafeReturnPath('/sr/jobs/x/apply')).toBe(true);
    expect(isSafeReturnPath('/candidate?tab=saved')).toBe(true);
  });

  it('refuses other hosts and non-paths', () => {
    for (const ret of [
      undefined,
      '',
      'https://evil.example',
      'evil.example',
      '//evil.example',
      // Browsers read a backslash as a slash: `/\host` is `//host`.
      '/\\evil.example',
      '/\\/evil.example',
      '/\tevil.example',
    ]) {
      expect(isSafeReturnPath(ret), String(ret)).toBe(false);
    }
  });
});
