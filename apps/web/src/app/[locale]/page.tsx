import type { Metadata } from 'next';
import { publicJobsEnabled } from 'shared';
import type { PublicJobListItem, PublicJobTaxonomyResponse } from 'contracts';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { MapPin } from 'lucide-react';

import { HomeAudiencePaths } from '@/features/home/home-audience-paths';
import { HomeFeaturedJobsStrip } from '@/features/home/home-featured-jobs-strip';
import { HomeHeroSearch } from '@/features/home/home-hero-search';
import { HomeHowItWorks } from '@/features/home/home-how-it-works';
import { HomePopularJobsStrip } from '@/features/home/home-popular-jobs-strip';
import { HomeRecentJobsStrip } from '@/features/home/home-recent-jobs-strip';
import { HomeSpotlightRail } from '@/features/home/home-spotlight-rail';
import { PublicJobTeaserCard } from '@/features/jobs/components/public-job-teaser-card';
import { SiteLaunchPanel } from '@/features/jobs/components/site-launch-panel';
import { buildListQuery } from '@/features/jobs/lib/jobs-list-query';
import { fetchCmsHomeJobsDiscovery } from '@/lib/cms-content';
import {
  buildCmsCategorySpotlightTiles,
  buildCmsCitySpotlightTiles,
} from '@/lib/home-jobs-discovery';
import { resolveNestPublicOrigin } from '@/lib/nest-api-url';
import { fetchPublicJobsList, fetchPublicJobTaxonomy } from '@/lib/public-jobs';
import { getUnifiedAuthSession } from '@/lib/unified-auth';
import { cn } from '@/lib/cn';
import { Link } from '@/i18n/navigation';
import { resolvePromoBanner } from '@/lib/promo-banner';
import { buildPublicPageMetadata } from '@/i18n/metadata';
import { JsonLd } from '@/components/json-ld';
import { organizationJsonLd, websiteJsonLd } from '@/lib/seo/json-ld';
import { absoluteSiteOrigin } from '@/lib/site-origin';

const emptyTaxonomy: PublicJobTaxonomyResponse = {
  cities: [],
  cityGroups: [],
  categories: [],
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Metadata');
  const title = t('title');
  return {
    ...buildPublicPageMetadata({
      locale,
      path: '/',
      title,
      description: t('description'),
    }),
    // Already carries the brand; skip the layout's "%s · Šljakam" template.
    title: { absolute: title },
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Home');
  const tJBadge = await getTranslations('JobDetail');
  const featuredRibbonLabel = tJBadge('featuredBadge');
  const authSession = await getUnifiedAuthSession();
  // The promo bar is site-wide (SiteShell → PromoBar); the employer card
  // repeats a running campaign's line.
  const promo = await resolvePromoBanner(locale, authSession.role);
  /** Valid access token (not merely cookie presence), so guest CTAs show when truly signed out. */
  const isAuthenticated = authSession.isAuthenticated;
  /**
   * Job links go straight to the jobs when they are public (`PUBLIC_JOBS`),
   * else through sign-in. The home components call this `isAuthenticated`.
   */
  const jobsOpen = isAuthenticated || publicJobsEnabled();

  const base = resolveNestPublicOrigin();
  let allItems: PublicJobListItem[] = [];
  /** Page 1 of the unfiltered list is empty: the site has no live job. */
  let siteEmpty = false;
  let taxonomy: PublicJobTaxonomyResponse = emptyTaxonomy;
  let cmsHomeDiscovery: Awaited<ReturnType<typeof fetchCmsHomeJobsDiscovery>> =
    null;

  if (base) {
    const qp = buildListQuery({}, 1, 48);
    const [listRes, taxRes, discovery] = await Promise.all([
      fetchPublicJobsList(base, qp),
      fetchPublicJobTaxonomy(base),
      fetchCmsHomeJobsDiscovery(locale),
    ]);
    cmsHomeDiscovery = discovery;
    if (listRes.ok) {
      allItems = listRes.data.items;
      siteEmpty = allItems.length === 0;
    }
    if (taxRes.ok) {
      taxonomy = taxRes.data;
    }
  }

  const categorySpotlightTiles = cmsHomeDiscovery?.categorySpotlights.length
    ? buildCmsCategorySpotlightTiles(
        cmsHomeDiscovery.categorySpotlights,
        taxonomy.categories,
      )
    : [];

  const citySpotlightTiles = cmsHomeDiscovery?.citySpotlights.length
    ? buildCmsCitySpotlightTiles(
        cmsHomeDiscovery.citySpotlights,
        taxonomy.cities,
      )
    : [];

  const featuredJobs = allItems.filter((j) => j.featured).slice(0, 6);
  const featuredIds = new Set(featuredJobs.map((j) => j.id));
  const moreOpeningJobs = allItems
    .filter((j) => !featuredIds.has(j.id))
    .slice(0, 12);

  const heroSearchAction = `/${locale}/jobs`;
  const heroJobs = featuredJobs.slice(0, 2);
  // Quick links under the search: the first categories, to their landings.
  const heroCategoryLinks = taxonomy.categories.slice(0, 4).map((c) => {
    const path = `/jobs/category/${c.slug}`;
    return {
      label: locale === 'en' ? (c.nameEn ?? c.nameSr) : c.nameSr,
      href: jobsOpen
        ? path
        : `/sign-in?returnTo=${encodeURIComponent(`/${locale}${path}`)}`,
    };
  });
  const audienceDict = {
    titlePrefix: t('audiencePathsTitlePrefix'),
    titleAccent: t('audiencePathsTitleAccent'),
    subtitle: t('audiencePathsSubtitle'),
    candidatesTitle: t('candidatePortalTitle'),
    candidatesBody: t('candidatePortalBody'),
    candidatesSignIn: t('candidatePortalPrimary'),
    candidatesRegister: t('candidatePortalSecondary'),
    employersTitle: t('employerPortalTitle'),
    employersBody: t('employerPortalBody'),
    employersSignIn: t('employerPortalPrimary'),
    employersRegister: t('employerPortalSecondary'),
  };

  return (
    <main>
      <JsonLd
        data={[
          organizationJsonLd(absoluteSiteOrigin()),
          websiteJsonLd(absoluteSiteOrigin(), locale),
        ]}
      />
      {/* Hero (redesign A): search on the left, real featured jobs floating
          on the right (large screens) until a hero photo is chosen. The title
          and search don't animate: they are the LCP. */}
      <section className="relative overflow-clip pb-14 pt-10 md:pb-24 md:pt-16">
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-featured-soft px-3.5 py-2 text-sm font-semibold text-featured-soft-foreground">
              <MapPin className="size-4" aria-hidden />
              {t('trustStrip')}
            </span>
            <h1 className="m-0 mt-5 text-[clamp(2.5rem,6vw,4.25rem)] font-extrabold leading-[1.02] tracking-[-0.035em] text-foreground">
              {t('headline').replace(t('headlineAccent'), '').trim()}{' '}
              <span className="text-primary [box-shadow:inset_0_-0.28em_0_var(--featured-soft)]">
                {t('headlineAccent')}
              </span>
            </h1>
            <p className="m-0 mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              {t('subhead')}
            </p>

            <HomeHeroSearch
              action={heroSearchAction}
              taxonomy={taxonomy}
              isAuthenticated={jobsOpen}
            />

            {heroCategoryLinks.length > 0 ? (
              <ul className="m-0 mt-5 flex list-none flex-wrap gap-2 p-0">
                {heroCategoryLinks.map((c) => (
                  <li key={c.href}>
                    <Link
                      href={c.href}
                      locale={locale}
                      className="hf-press inline-flex min-h-10 items-center rounded-full border border-border bg-card px-4 text-sm font-medium text-muted-foreground no-underline hover:text-foreground"
                    >
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {heroJobs.length > 0 ? (
            <ul
              aria-label={t('featuredSpotlightTitle')}
              className="relative m-0 hidden min-h-[440px] list-none p-0 lg:block"
            >
              {heroJobs.map((job, i) => (
                <li
                  key={job.id}
                  className={cn(
                    'hf-float absolute w-[300px]',
                    i === 0
                      ? 'right-0 top-4 -rotate-2'
                      : 'bottom-4 left-4 rotate-2 [animation-delay:-3s]',
                  )}
                >
                  <PublicJobTeaserCard
                    job={job}
                    locale={locale}
                    spotlight
                    featuredRibbonLabel={featuredRibbonLabel}
                    isAuthenticated={jobsOpen}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      {/* Content sections */}
      <div className="mx-auto max-w-6xl space-y-14 px-4 pb-20 md:space-y-28">
        {/* Job listing sections grouped with tighter spacing */}
        <div className="space-y-12">
          {siteEmpty ? (
            <SiteLaunchPanel viewer={authSession.role} variant="home" />
          ) : null}
          <HomeFeaturedJobsStrip
            locale={locale}
            items={featuredJobs}
            title={t('featuredSpotlightTitle')}
            subtitle={t('featuredSpotlightSubtitle')}
            viewAllLabel={t('viewAllJobs')}
            featuredRibbonLabel={featuredRibbonLabel}
            isAuthenticated={jobsOpen}
          />

          <HomePopularJobsStrip
            locale={locale}
            items={moreOpeningJobs}
            // "More positions" only reads right below the featured strip.
            title={
              featuredJobs.length > 0
                ? t('moreListingsTitle')
                : t('latestListingsTitle')
            }
            viewAllLabel={t('viewAllJobs')}
            featuredRibbonLabel={featuredRibbonLabel}
            isAuthenticated={jobsOpen}
          />

          <HomeRecentJobsStrip
            locale={locale}
            featuredRibbonLabel={featuredRibbonLabel}
            isAuthenticated={jobsOpen}
          />
        </div>

        <HomeSpotlightRail
          variant="grid"
          title={t('spotlightCategoriesTitle')}
          titleAccent={t('spotlightCategoriesAccent')}
          subtitle={t('spotlightCategoriesSubtitle')}
          tiles={categorySpotlightTiles}
          exploreLabelPrefix={t('spotlightExplorePrefix')}
          isAuthenticated={jobsOpen}
        />

        <HomeSpotlightRail
          title={t('spotlightCitiesTitle')}
          titleAccent={t('spotlightCitiesAccent')}
          subtitle={t('spotlightCitiesSubtitle')}
          tiles={citySpotlightTiles}
          initialOpenIndex={Math.max(0, citySpotlightTiles.length - 1)}
          exploreLabelPrefix={t('spotlightExplorePrefix')}
          isAuthenticated={jobsOpen}
        />

        <HomeHowItWorks
          title={t('howItWorksTitle')}
          s1Title={t('howStep1Title')}
          s1Body={t('howStep1Body')}
          s2Title={t('howStep2Title')}
          s2Body={t('howStep2Body')}
          s3Title={t('howStep3Title')}
          s3Body={t('howStep3Body')}
        />

        {!isAuthenticated && (
          <HomeAudiencePaths
            locale={locale}
            t={audienceDict}
            promo={promo?.text}
          />
        )}
      </div>
    </main>
  );
}
