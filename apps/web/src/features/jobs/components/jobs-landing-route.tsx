import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { JsonLd } from '@/components/json-ld';
import { buildPublicPageMetadata } from '@/i18n/metadata';
import { Link } from '@/i18n/navigation';
import { resolveNestPublicOrigin } from '@/lib/nest-api-url';
import {
  fetchPublicJobTaxonomy,
  fetchPublicSitemap,
  isPublicApiOutage,
  PublicApiUnavailableError,
} from '@/lib/public-jobs';
import { breadcrumbJsonLd } from '@/lib/seo/json-ld';
import { fetchCmsLandingSpotlight } from '@/lib/cms-content';
import { absoluteSiteOrigin } from '@/lib/site-origin';

import {
  resolveLanding,
  type LandingInfo,
  type LandingKey,
} from '../lib/landing';
import type { JobsSearchParams } from '../lib/jobs-list-query';

import { JobsListRoute } from './jobs-list-route';

/**
 * Hero photo and intro from the homepage tiles in CMS: the city's (else the
 * category's) image; the CMS intro only on a single city or category page,
 * where it describes exactly that page.
 */
async function landingCms(
  locale: string,
  key: LandingKey,
): Promise<{ imageUrl: string | null; intro: string | null }> {
  const spot = key.city
    ? await fetchCmsLandingSpotlight('city', key.city, locale)
    : key.category
      ? await fetchCmsLandingSpotlight('category', key.category, locale)
      : null;
  const single = Boolean(key.city) !== Boolean(key.category);
  return {
    imageUrl: spot?.imageUrl ?? null,
    intro: single ? (spot?.intro ?? null) : null,
  };
}

/**
 * City, category and city × category landing pages (`/jobs/city/{city}`,
 * `/jobs/category/{category}[/city/{city}]`): the live job list with its own
 * title, intro, breadcrumbs and links to neighbouring pages.
 * Not exported from the `features/jobs` barrel (server-only).
 */
async function loadLanding(
  locale: string,
  key: LandingKey,
): Promise<LandingInfo | null> {
  const base = resolveNestPublicOrigin();
  if (!base) return null;
  const [taxonomy, live] = await Promise.all([
    fetchPublicJobTaxonomy(base),
    fetchPublicSitemap(base),
  ]);
  // Only an unknown city/category is a 404; an outage must not be one.
  for (const r of [taxonomy, live]) {
    if (!r.ok && isPublicApiOutage(r)) {
      throw new PublicApiUnavailableError('landing', r);
    }
  }
  if (!taxonomy.ok || !live.ok) return null;
  return resolveLanding(key, locale, taxonomy.data, live.data.facets);
}

async function landingText(locale: string, info: LandingInfo) {
  const t = await getTranslations({ locale, namespace: 'Landing' });
  const city = info.cityName ?? '';
  const category = info.categoryName ?? '';
  const title =
    info.cityName && info.categoryName
      ? t('pairTitle', { city, category })
      : info.cityName
        ? t('cityTitle', { city })
        : t('categoryTitle', { category });
  return { t, title, intro: t('intro', { count: info.liveJobs }) };
}

export async function buildJobsLandingMetadata(
  params: Promise<{ locale: string }>,
  key: LandingKey,
  searchParams: Promise<JobsSearchParams>,
): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const info = await loadLanding(locale, key);
  if (!info) return {};
  const { t, title } = await landingText(locale, info);
  const page = Math.max(1, parseInt((await searchParams).page ?? '1', 10) || 1);
  return buildPublicPageMetadata({
    locale,
    path: info.path,
    canonicalPath: page > 1 ? `${info.path}?page=${page}` : info.path,
    title: page > 1 ? `${title} — ${t('page', { page })}` : title,
    description: t('metaDescription', { title, count: info.liveJobs }),
    // No live jobs: an empty page; keep it out of the index (and sitemap).
    // Page 2+ repeats page 1 for guests and crawlers (option B).
    noindex: info.liveJobs < 1 || page > 1,
  });
}

export async function JobsLandingRoute({
  params,
  searchParams,
  landing: key,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<JobsSearchParams>;
  landing: LandingKey;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const info = await loadLanding(locale, key);
  if (!info) notFound();

  const { t, title, intro } = await landingText(locale, info);
  const cms = await landingCms(locale, key);
  const tNav = await getTranslations({ locale, namespace: 'Nav' });
  const origin = absoluteSiteOrigin();
  const crumbs = [
    { name: tNav('home'), path: '' },
    { name: tNav('jobs'), path: '/jobs' },
    ...(info.categoryName && info.cityName
      ? [
          {
            name: info.categoryName,
            path: `/jobs/category/${key.category}`,
          },
        ]
      : []),
    { name: info.cityName ?? info.categoryName ?? title, path: info.path },
  ];

  const related = [
    { heading: t('otherCities'), links: info.otherCities },
    { heading: t('otherCategories'), links: info.otherCategories },
  ].filter((r) => r.links.length > 0);

  return (
    <JobsListRoute
      params={params}
      searchParams={searchParams}
      fixed={key}
      heading={{
        title,
        // The CMS intro says what the page is; the live-jobs count follows.
        intro: cms.intro ? `${cms.intro} ${intro}` : intro,
        imageUrl: cms.imageUrl,
      }}
      before={
        <>
          <JsonLd
            data={[
              breadcrumbJsonLd(
                crumbs.map((c) => ({
                  name: c.name,
                  url: `${origin}/${locale}${c.path}`,
                })),
              ),
            ]}
          />
          <nav aria-label={t('breadcrumb')} className="mb-4 text-sm">
            <ol className="m-0 flex list-none flex-wrap gap-1.5 p-0 text-muted-foreground">
              {crumbs.map((c, i) => (
                <li key={c.path} className="flex items-center gap-1.5">
                  {i > 0 ? <span aria-hidden>/</span> : null}
                  {i < crumbs.length - 1 ? (
                    <Link
                      href={c.path || '/'}
                      className="underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {c.name}
                    </Link>
                  ) : (
                    <span aria-current="page" className="text-foreground">
                      {c.name}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </>
      }
      after={
        related.length ? (
          <section className="mt-12 grid gap-8 sm:grid-cols-2">
            {related.map((r) => (
              <div key={r.heading}>
                <h2 className="m-0 mb-3.5 text-[1.375rem] font-extrabold text-foreground">
                  {r.heading}
                </h2>
                <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                  {r.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="hf-press inline-flex min-h-10 items-center rounded-full border border-border bg-card px-3.5 text-sm font-medium text-foreground no-underline hover:border-primary/50"
                      >
                        {l.label}
                        <span className="ml-1.5 text-muted-foreground">
                          {l.count}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ) : null
      }
    />
  );
}
