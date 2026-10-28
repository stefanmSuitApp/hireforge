import type { PublicJobTaxonomyItem, PublicSitemapResponse } from 'contracts';

import { landingPath } from '@/lib/seo/sitemap';

export type LandingKey = { city?: string; category?: string };

export type LandingLink = { href: string; label: string; count: number };

export type LandingInfo = {
  path: string;
  cityName: string | null;
  categoryName: string | null;
  liveJobs: number;
  /** Live featured jobs: what a guest sees in full (decides indexing). */
  featuredJobs: number;
  otherCities: LandingLink[];
  otherCategories: LandingLink[];
};

const RELATED_LIMIT = 8;

const labelFor = (item: PublicJobTaxonomyItem, locale: string) =>
  locale === 'en' ? (item.nameEn ?? item.nameSr) : item.nameSr;

/**
 * Names, live job count and neighbouring landing pages for a city, category
 * or city × category page. `null` when a slug isn't in the taxonomy (404).
 * Related links only point at pages that have live jobs.
 */
export function resolveLanding(
  key: LandingKey,
  locale: string,
  taxonomy: {
    cities: PublicJobTaxonomyItem[];
    categories: PublicJobTaxonomyItem[];
  },
  facets: PublicSitemapResponse['facets'],
): LandingInfo | null {
  const city = key.city
    ? taxonomy.cities.find((c) => c.slug === key.city)
    : undefined;
  const category = key.category
    ? taxonomy.categories.find((c) => c.slug === key.category)
    : undefined;
  if ((key.city && !city) || (key.category && !category)) return null;
  const path = landingPath(key.city ?? null, key.category ?? null);
  if (!path) return null;

  const matches = (f: PublicSitemapResponse['facets'][number]) =>
    (!key.city || f.city === key.city) &&
    (!key.category || f.category === key.category);
  const matched = facets.filter(matches);
  const liveJobs = matched.reduce((n, f) => n + f.liveJobs, 0);
  const featuredJobs = matched.reduce((n, f) => n + f.featuredJobs, 0);

  /** Sum live jobs by `dim` over facets that keep the other dimension fixed. */
  function neighbours(
    dim: 'city' | 'category',
    items: PublicJobTaxonomyItem[],
  ): LandingLink[] {
    const keepOther = dim === 'city' ? key.category : key.city;
    const own = dim === 'city' ? key.city : key.category;
    const counts = new Map<string, number>();
    for (const f of facets) {
      const slug = f[dim];
      if (!slug || slug === own || f.liveJobs < 1) continue;
      const other = dim === 'city' ? f.category : f.city;
      if (keepOther && other !== keepOther) continue;
      counts.set(slug, (counts.get(slug) ?? 0) + f.liveJobs);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, RELATED_LIMIT)
      .flatMap(([slug, count]) => {
        const item = items.find((i) => i.slug === slug);
        const href =
          dim === 'city'
            ? landingPath(slug, key.category ?? null)
            : landingPath(key.city ?? null, slug);
        return item && href
          ? [{ href, label: labelFor(item, locale), count }]
          : [];
      });
  }

  return {
    path,
    cityName: city ? labelFor(city, locale) : null,
    categoryName: category ? labelFor(category, locale) : null,
    liveJobs,
    featuredJobs,
    otherCities: neighbours('city', taxonomy.cities),
    otherCategories: neighbours('category', taxonomy.categories),
  };
}

/** Cities and categories with the most live jobs, as landing links. */
export function topLandingLinks(
  locale: string,
  taxonomy: {
    cities: PublicJobTaxonomyItem[];
    categories: PublicJobTaxonomyItem[];
  },
  facets: PublicSitemapResponse['facets'],
  limit = RELATED_LIMIT,
): { cities: LandingLink[]; categories: LandingLink[] } {
  const top = (dim: 'city' | 'category', items: PublicJobTaxonomyItem[]) => {
    const counts = new Map<string, number>();
    for (const f of facets) {
      const slug = f[dim];
      if (slug && f.liveJobs > 0)
        counts.set(slug, (counts.get(slug) ?? 0) + f.liveJobs);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, limit)
      .flatMap(([slug, count]) => {
        const item = items.find((i) => i.slug === slug);
        const href =
          dim === 'city' ? landingPath(slug, null) : landingPath(null, slug);
        return item && href
          ? [{ href, label: labelFor(item, locale), count }]
          : [];
      });
  };
  return {
    cities: top('city', taxonomy.cities),
    categories: top('category', taxonomy.categories),
  };
}
