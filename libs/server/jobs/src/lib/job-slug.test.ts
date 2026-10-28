import { describe, expect, it } from 'vitest';

import { buildPublishedJobFullSlug, shortIdFromJobSlug } from './job-slug';

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
