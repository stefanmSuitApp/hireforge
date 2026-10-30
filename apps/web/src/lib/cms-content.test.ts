import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchCmsEditorialPage, fetchCmsLandingSpotlight } from './cms-content';

const { fetchMock, createSanityReadClient } = vi.hoisted(() => {
  const fetchMock = vi.fn();
  return {
    fetchMock,
    createSanityReadClient: vi.fn(() => ({ fetch: fetchMock })),
  };
});

vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));
vi.mock('shared', () => ({ createSanityReadClient }));

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

  it('reads Sanity directly, not through its CDN', async () => {
    fetchMock.mockResolvedValue(null);

    await fetchCmsEditorialPage('about-hireforge', 'en');

    expect(createSanityReadClient).toHaveBeenCalledWith(
      expect.objectContaining({ useCdn: false }),
    );
  });
});

describe('fetchCmsLandingSpotlight', () => {
  beforeEach(() => fetchMock.mockReset());

  it('returns the intro and a landing-sized image for the city', async () => {
    vi.stubEnv('SANITY_PROJECT_ID', 'o85214ma');
    fetchMock.mockResolvedValue({
      intro: ' Svi aktuelni oglasi za posao u Subotici. ',
      image: {
        _type: 'image',
        asset: { _ref: 'image-abc123-2400x1600-jpg' },
      },
    });

    const spot = await fetchCmsLandingSpotlight('city', 'subotica', 'sr');

    expect(spot?.intro).toBe('Svi aktuelni oglasi za posao u Subotici.');
    expect(spot?.imageUrl).toMatch(/w=2304&h=600&fit=crop/);
    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      'citySpotlights[citySlug == $slug]',
    );
  });
});
