import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchCmsEditorialPage } from './cms-content';

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));
vi.mock('shared', () => ({
  createSanityReadClient: () => ({ fetch: fetchMock }),
}));

const block = (text: string) => [
  { _type: 'block', children: [{ _type: 'span', text }] },
];

describe('fetchCmsEditorialPage', () => {
  beforeEach(() => fetchMock.mockReset());

  it('returns the body in the page locale', async () => {
    fetchMock.mockResolvedValue({
      title: 'About Šljakam',
      excerpt: null,
      body: {
        _type: 'localeBlockContent',
        sr: block('Šljakam se fokusira na jasne oglase.'),
        en: block('Šljakam focuses on clear job listings.'),
      },
      seoTitle: null,
      seoDescription: null,
    });

    const page = await fetchCmsEditorialPage('about-hireforge', 'en');

    expect(page?.body).toEqual(block('Šljakam focuses on clear job listings.'));
  });
});
