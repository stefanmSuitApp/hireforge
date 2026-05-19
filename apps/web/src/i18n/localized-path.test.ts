import { describe, expect, it } from 'vitest';

import { buildLocalizedPath, stripLocalePrefix } from '@/i18n/localized-path';

describe('localized path helpers', () => {
  it('strips locale prefixes without touching non-localized paths', () => {
    expect(stripLocalePrefix('/sr/employer/jobs')).toBe('/employer/jobs');
    expect(stripLocalePrefix('/en')).toBe('/');
    expect(stripLocalePrefix('/jobs')).toBe('/jobs');
  });

  it('builds locale-safe paths without duplicating prefixes', () => {
    expect(buildLocalizedPath('en', '/employer')).toBe('/en/employer');
    expect(buildLocalizedPath('en', '/en/employer')).toBe('/en/employer');
    expect(buildLocalizedPath('sr', '/en/jobs', 'page=2')).toBe(
      '/sr/jobs?page=2',
    );
  });
});
