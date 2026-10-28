import { describe, expect, it } from 'vitest';
import {
  buildPublishedJobFullSlug,
  jobSlugBaseFromTitleAndCity,
  makeShortId,
  shortIdFromJobSlug,
  transliterateToAsciiBasic,
} from './job-slug';

describe('job slugs', () => {
  it('turn title and city into lowercase ASCII kebab case', () => {
    expect(jobSlugBaseFromTitleAndCity('Vozač C kategorije!', 'Čačak')).toBe(
      'vozac-c-kategorije-cacak',
    );
  });

  it('work without a city', () => {
    expect(jobSlugBaseFromTitleAndCity('Senior QA', null)).toBe('senior-qa');
    expect(jobSlugBaseFromTitleAndCity('Senior QA', '   ')).toBe('senior-qa');
  });

  it('drop Cyrillic letters Serbian does not have instead of keeping them', () => {
    expect(jobSlugBaseFromTitleAndCity('Пекарь', 'Ниш')).toBe('pekar-nis');
  });

  it('fall back to "job" when nothing is left', () => {
    expect(jobSlugBaseFromTitleAndCity('!!!', undefined)).toBe('job');
  });

  it('cap the stem at 55 characters without a trailing hyphen', () => {
    const base = jobSlugBaseFromTitleAndCity('a'.repeat(54) + ' b', null);
    expect(base.length).toBeLessThanOrEqual(55);
    expect(base.endsWith('-')).toBe(false);
  });

  it('append the short id for the published slug', () => {
    expect(buildPublishedJobFullSlug('Pekar', 'Niš', 'x7k2')).toBe(
      'pekar-nis-x7k2',
    );
  });

  it('short ids are 4 lowercase letters or digits', () => {
    const ids = new Set(Array.from({ length: 200 }, makeShortId));
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]{4}$/);
    expect(ids.size).toBeGreaterThan(150);
  });

  it('the short id is read back from a published slug, else null', () => {
    expect(
      shortIdFromJobSlug(buildPublishedJobFullSlug('Pekar', 'Niš', 'x7k2')),
    ).toBe('x7k2');
    expect(shortIdFromJobSlug('pekar-nis')).toBeNull();
  });

  it('transliteration strips Latin diacritics and ß', () => {
    expect(transliterateToAsciiBasic('Šćžčß')).toBe('Sczcss');
  });

  // Was a Known issue (PROGRESS.md): đ has no Unicode decomposition, so NFD
  // kept it and the slug turned it into a hyphen ("racunovo-a").
  it('đ becomes dj in a slug (Računovođa → racunovodja, Đurđevo → djurdjevo)', () => {
    expect(jobSlugBaseFromTitleAndCity('Računovođa', 'Đurđevo')).toBe(
      'racunovodja-djurdjevo',
    );
    expect(transliterateToAsciiBasic('Đorđe')).toBe('Djordje');
  });
});
