import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { buildPublicPageMetadata } from '@/i18n/metadata';
import { resolveNestPublicOrigin } from '@/lib/nest-api-url';
import { fetchPublicJobsList } from '@/lib/public-jobs';
import { landingPath } from '@/lib/seo/sitemap';

import {
  buildListQuery,
  JOBS_LIST_PAGE_SIZE,
  type JobsSearchParams,
} from './jobs-list-query';

/**
 * How a `/jobs?…` URL should be indexed:
 * - no filters: itself (paginated pages self-canonical, `?page=N`);
 * - only city and/or category: canonical to its landing page;
 * - anything else (search text, work model, …): `noindex,follow`.
 * `job` (desktop preview selection) never changes the page's identity.
 */
export function jobsListIndexing(sp: JobsSearchParams): {
  canonicalPath: string;
  noindex: boolean;
} {
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const pageSuffix = page > 1 ? `?page=${page}` : '';
  const city = sp.city?.trim() || null;
  const category = sp.category?.trim() || null;
  const otherFilters = Boolean(
    sp.q?.trim() ||
      sp.workModel?.trim() ||
      sp.employmentType?.trim() ||
      sp.postedWithin?.trim() ||
      sp.easyApply === '1' ||
      sp.easyApply === 'true' ||
      (sp.pageSize && sp.pageSize !== String(JOBS_LIST_PAGE_SIZE)),
  );
  if (otherFilters) {
    return { canonicalPath: '/jobs', noindex: true };
  }
  const landing = landingPath(city, category);
  return {
    canonicalPath: `${landing ?? '/jobs'}${pageSuffix}`,
    noindex: false,
  };
}

export async function buildJobsListMetadata(
  params: Promise<{ locale: string }>,
  searchParams: Promise<JobsSearchParams>,
): Promise<Metadata> {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('Jobs');
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const hasFilters = Boolean(
    sp.q?.trim() || sp.city?.trim() || sp.category?.trim(),
  );
  const title =
    page > 1
      ? `${t('title')} — ${t('pageTitleSuffix', { page })}`
      : hasFilters
        ? t('titleFiltered')
        : t('title');

  const { canonicalPath, noindex } = jobsListIndexing(sp);
  // An empty result page has nothing to index.
  let empty = false;
  const base = resolveNestPublicOrigin();
  if (base && !noindex) {
    const list = await fetchPublicJobsList(
      base,
      buildListQuery(sp, page, JOBS_LIST_PAGE_SIZE),
    );
    empty = list.ok && list.data.items.length === 0;
  }

  return buildPublicPageMetadata({
    locale,
    path: '/jobs',
    canonicalPath,
    title,
    description: t('listDescription'),
    noindex: noindex || empty,
  });
}
