import { describe, expect, it } from 'vitest';

import { resolveLanding, topLandingLinks } from './landing';

const taxonomy = {
  cities: [
    { id: '1', slug: 'beograd', nameSr: 'Beograd', nameEn: 'Belgrade' },
    { id: '2', slug: 'nis', nameSr: 'Niš', nameEn: 'Nis' },
    { id: '3', slug: 'novi-sad', nameSr: 'Novi Sad', nameEn: 'Novi Sad' },
  ],
  categories: [
    { id: 'a', slug: 'it', nameSr: 'IT', nameEn: 'IT' },
    { id: 'b', slug: 'prodaja', nameSr: 'Prodaja', nameEn: 'Sales' },
  ],
};
const facets = [
  { city: 'beograd', category: 'it', liveJobs: 3, lastmod: null },
  { city: 'beograd', category: 'prodaja', liveJobs: 1, lastmod: null },
  { city: 'nis', category: 'it', liveJobs: 2, lastmod: null },
  { city: 'novi-sad', category: 'prodaja', liveJobs: 0, lastmod: null },
];

describe('resolveLanding', () => {
  it('counts live jobs and links to neighbours that have jobs', () => {
    const city = resolveLanding({ city: 'beograd' }, 'sr', taxonomy, facets);
    expect(city).toMatchObject({
      path: '/jobs/city/beograd',
      cityName: 'Beograd',
      liveJobs: 4,
    });
    expect(city?.otherCities.map((l) => l.href)).toEqual(['/jobs/city/nis']);
    expect(city?.otherCategories).toEqual([
      { href: '/jobs/category/it/city/beograd', label: 'IT', count: 3 },
      {
        href: '/jobs/category/prodaja/city/beograd',
        label: 'Prodaja',
        count: 1,
      },
    ]);
  });

  it('keeps the category fixed when listing other cities', () => {
    const pair = resolveLanding(
      { city: 'beograd', category: 'it' },
      'en',
      taxonomy,
      facets,
    );
    expect(pair?.liveJobs).toBe(3);
    expect(pair?.otherCities).toEqual([
      { href: '/jobs/category/it/city/nis', label: 'Nis', count: 2 },
    ]);
  });

  it('reports zero for a known place without jobs and null for unknown slugs', () => {
    expect(
      resolveLanding({ city: 'novi-sad' }, 'sr', taxonomy, facets)?.liveJobs,
    ).toBe(0);
    expect(
      resolveLanding({ city: 'atlantida' }, 'sr', taxonomy, facets),
    ).toBeNull();
    expect(
      resolveLanding({ category: 'nepostoji' }, 'sr', taxonomy, facets),
    ).toBeNull();
  });
});

describe('topLandingLinks', () => {
  it('ranks cities and categories by live jobs', () => {
    const top = topLandingLinks('sr', taxonomy, facets);
    expect(top.cities.map((l) => [l.href, l.count])).toEqual([
      ['/jobs/city/beograd', 4],
      ['/jobs/city/nis', 2],
    ]);
    expect(top.categories.map((l) => l.label)).toEqual(['IT', 'Prodaja']);
  });
});
