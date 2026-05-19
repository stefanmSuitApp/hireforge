import { describe, expect, it } from 'vitest';

import { buildLocaleAlternates } from '@/i18n/metadata';

describe('buildLocaleAlternates', () => {
  it('builds canonical and language alternates for locale-prefixed routes', () => {
    expect(buildLocaleAlternates('en', '/jobs')).toEqual({
      canonical: '/en/jobs',
      languages: {
        sr: '/sr/jobs',
        en: '/en/jobs',
        'x-default': '/sr/jobs',
      },
    });
  });

  it('treats the root path as the locale root', () => {
    expect(buildLocaleAlternates('sr', '/')).toEqual({
      canonical: '/sr',
      languages: {
        sr: '/sr',
        en: '/en',
        'x-default': '/sr',
      },
    });
  });
});
