import { describe, expect, it } from 'vitest';

import {
  buildPublishedJobFullSlug,
  jobSlugBaseFromTitleAndCity,
  shortIdFromJobSlug,
} from './job-slug';

describe('shortIdFromJobSlug', () => {
  it('reads the trailing short id of a published slug', () => {
    const slug = buildPublishedJobFullSlug('Programer', 'Beograd', 'a1b2');
    expect(shortIdFromJobSlug(slug)).toBe('a1b2');
  });

  it('returns null when there is no short id suffix', () => {
    expect(shortIdFromJobSlug('programer-beograd')).toBeNull();
    expect(shortIdFromJobSlug('programer-AB12')).toBeNull();
  });
});

describe('job slugs', () => {
  it('spells đ as dj instead of dropping it', () => {
    expect(jobSlugBaseFromTitleAndCity('Vođa smene', 'Aranđelovac')).toBe(
      'vodja-smene-arandjelovac',
    );
    expect(jobSlugBaseFromTitleAndCity('ĐAK', null)).toBe('djak');
  });

  it('strips the other Serbian diacritics and appends the short id', () => {
    expect(buildPublishedJobFullSlug('Šef kuhinje', 'Čačak', 'ab12')).toBe(
      'sef-kuhinje-cacak-ab12',
    );
  });
});
