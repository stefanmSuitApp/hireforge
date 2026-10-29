import { publicJobsEnabled } from 'shared';

import { fetchCmsEditorialSlugs } from '@/lib/cms-content';
import { resolveNestPublicOrigin } from '@/lib/nest-api-url';
import { fetchPublicSitemap } from '@/lib/public-jobs';

import {
  chunk,
  companyEntries,
  jobEntries,
  landingEntries,
  type SitemapEntry,
} from './sitemap';

/** CMS slugs served elsewhere: `/about` renders these, `/p/about-hireforge` redirects. */
const ABOUT_SLUGS = new Set(['about-hireforge', 'about']);

/**
 * Every child sitemap by file name. Job, company and landing files exist only
 * while `PUBLIC_JOBS` is on (otherwise those pages redirect to sign-in).
 * Sign-in and other noindex/redirecting URLs are never listed.
 */
export async function loadSitemapFiles(): Promise<Map<string, SitemapEntry[]>> {
  const files = new Map<string, SitemapEntry[]>();
  const publicJobs = publicJobsEnabled();
  const base = resolveNestPublicOrigin();
  const live =
    publicJobs && base ? await fetchPublicSitemap(base, { fresh: true }) : null;
  if (live && !live.ok) {
    // Fail loud: an empty job sitemap would tell crawlers every job is gone.
    throw new Error(`sitemap data unavailable: ${live.error}`);
  }
  const cms = await fetchCmsEditorialSlugs();

  const pages: SitemapEntry[] = [{ path: '' }];
  // `/jobs` is noindex while nothing is live; listing it then only earns a
  // "submitted URL marked noindex" warning in Search Console.
  if (live?.data.jobs.length) pages.push({ path: '/jobs' });
  if (publicJobs) pages.push({ path: '/employers' });
  const about = cms.filter((p) => ABOUT_SLUGS.has(p.slug));
  if (about.length) {
    pages.push({ path: '/about', lastmod: about[0]?.updatedAt ?? null });
  }
  for (const page of cms) {
    if (!ABOUT_SLUGS.has(page.slug)) {
      pages.push({ path: `/p/${page.slug}`, lastmod: page.updatedAt });
    }
  }
  files.set('pages.xml', pages);
  if (!live) return files;

  const add = (prefix: string, entries: SitemapEntry[]) =>
    chunk(entries).forEach((part, i) => files.set(`${prefix}-${i}.xml`, part));
  add('landing', landingEntries(live.data.facets));
  add('companies', companyEntries(live.data.companies));
  add('jobs', jobEntries(live.data.jobs));
  return files;
}

export function newestLastmod(entries: SitemapEntry[]): string | null {
  return entries.reduce<string | null>(
    (acc, e) => (e.lastmod && (!acc || e.lastmod > acc) ? e.lastmod : acc),
    null,
  );
}
