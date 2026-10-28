import type { PublicSitemapResponse } from 'contracts';

import { routing } from '@/i18n/routing';

/** Google's limit is 50 000; smaller files are faster to fetch and diff. */
export const SITEMAP_MAX_URLS = 5000;

export type SitemapEntry = {
  /** Path after the locale (`/jobs/x`, or `` for the locale root). */
  path: string;
  lastmod?: string | null;
};

const xmlEscape = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * One `<url>` per locale, each listing every locale plus `x-default` (the
 * default locale) as `xhtml:link` alternates, as Google expects for hreflang
 * in sitemaps.
 */
export function urlsetXml(origin: string, entries: SitemapEntry[]): string {
  const urls = entries.flatMap(({ path, lastmod }) => {
    const alternates = [
      ...routing.locales.map((l) => [l, `${origin}/${l}${path}`]),
      ['x-default', `${origin}/${routing.defaultLocale}${path}`],
    ]
      .map(
        ([lang, href]) =>
          `<xhtml:link rel="alternate" hreflang="${lang}" href="${xmlEscape(href)}"/>`,
      )
      .join('');
    return routing.locales.map(
      (l) =>
        `<url><loc>${xmlEscape(`${origin}/${l}${path}`)}</loc>${
          lastmod ? `<lastmod>${xmlEscape(lastmod)}</lastmod>` : ''
        }${alternates}</url>`,
    );
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
}

export function sitemapIndexXml(
  origin: string,
  files: Array<{ name: string; lastmod?: string | null }>,
): string {
  const items = files.map(
    ({ name, lastmod }) =>
      `<sitemap><loc>${xmlEscape(`${origin}/sitemaps/${name}`)}</loc>${
        lastmod ? `<lastmod>${xmlEscape(lastmod)}</lastmod>` : ''
      }</sitemap>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join('\n')}\n</sitemapindex>\n`;
}

/** Entries per file so that each file (all locales) stays ≤ SITEMAP_MAX_URLS. */
export const ENTRIES_PER_FILE = Math.floor(
  SITEMAP_MAX_URLS / routing.locales.length,
);

export function chunk<T>(items: T[], size = ENTRIES_PER_FILE): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    out.push(items.slice(i, i + size));
  return out;
}

/** Public paths of the programmatic landing pages (see `landingPath`). */
export function landingPath(
  city: string | null,
  category: string | null,
): string | null {
  if (category && city) return `/jobs/category/${category}/city/${city}`;
  if (category) return `/jobs/category/${category}`;
  if (city) return `/jobs/city/${city}`;
  return null;
}

const newest = (a: string | null, b: string | null) =>
  !a ? b : !b ? a : a > b ? a : b;

/**
 * City, category and city × category landing pages with at least one live
 * featured job. Guests see only teasers of the other jobs, so a page without
 * a featured one is thin: noindex and out of the sitemap.
 */
export function landingEntries(
  facets: PublicSitemapResponse['facets'],
): SitemapEntry[] {
  const byPath = new Map<string, string | null>();
  const add = (path: string | null, lastmod: string | null) => {
    if (path) byPath.set(path, newest(byPath.get(path) ?? null, lastmod));
  };
  for (const f of facets) {
    if (f.featuredJobs < 1) continue;
    add(landingPath(f.city, null), f.lastmod);
    add(landingPath(null, f.category), f.lastmod);
    add(landingPath(f.city, f.category), f.lastmod);
  }
  return [...byPath.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, lastmod]) => ({ path, lastmod }));
}

export function jobEntries(
  jobs: PublicSitemapResponse['jobs'],
): SitemapEntry[] {
  return jobs.map((j) => ({
    path: `/jobs/${j.slug ?? j.id}`,
    lastmod: j.lastmod,
  }));
}

export function companyEntries(
  companies: PublicSitemapResponse['companies'],
): SitemapEntry[] {
  return companies
    .filter((c) => c.featuredJobs > 0)
    .map((c) => ({ path: `/companies/${c.slug}`, lastmod: c.lastmod }));
}
