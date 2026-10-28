import { describe, expect, it } from 'vitest';

import {
  buildPublishedJobFullSlug,
  shortIdFromJobSlug,
  transliterateToAsciiBasic,
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

describe('transliterateToAsciiBasic', () => {
  it('keeps đ readable instead of dropping it', () => {
    expect(transliterateToAsciiBasic('Građevinski inženjer')).toBe(
      'Gradjevinski inzenjer',
    );
    expect(
      buildPublishedJobFullSlug('Građevinski inženjer', 'Niš', 'ab12'),
    ).toBe('gradjevinski-inzenjer-nis-ab12');
  });

  it('transliterates Serbian Cyrillic', () => {
    expect(transliterateToAsciiBasic('Програмер Љубљана Џак Ђорђе')).toBe(
      'Programer Ljubljana Dzak Djordje',
    );
    expect(buildPublishedJobFullSlug('Возач', 'Београд', 'zz99')).toBe(
      'vozac-beograd-zz99',
    );
  });
});
