import type { PublicJobListItem, PublicJobTaxonomyResponse } from 'contracts';
import {
  getTranslations,
  setRequestLocale,
} from 'next-intl/server';

import { HomeAudiencePaths } from '@/features/home/home-audience-paths';
import { HomeFeaturedJobsStrip } from '@/features/home/home-featured-jobs-strip';
import { HomeHeroSearch } from '@/features/home/home-hero-search';
import { HomeHowItWorks } from '@/features/home/home-how-it-works';
import { HomePopularJobsStrip } from '@/features/home/home-popular-jobs-strip';
import { HomeRecentJobsStrip } from '@/features/home/home-recent-jobs-strip';
import { HomeSpotlightRail } from '@/features/home/home-spotlight-rail';
import { buildListQuery } from '@/features/jobs/lib/jobs-list-query';
import { fetchCmsHomeJobsDiscovery, fetchCmsHomePromoBanner } from '@/lib/cms-content';
import {
  buildCmsCategorySpotlightTiles,
  buildCmsCitySpotlightTiles,
} from '@/lib/home-jobs-discovery';
import { resolveNestPublicOrigin } from '@/lib/nest-api-url';
import { fetchPublicJobsList, fetchPublicJobTaxonomy } from '@/lib/public-jobs';
import { getUnifiedAuthSession } from '@/lib/unified-auth';
import { Link } from '@/i18n/navigation';

const emptyTaxonomy: PublicJobTaxonomyResponse = {
  cities: [],
  cityGroups: [],
  categories: [],
};

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
  const [authSession, promoBanner] = await Promise.all([
    getUnifiedAuthSession(),
    fetchCmsHomePromoBanner(locale),
  ]);
  /** Valid access token (not merely cookie presence), so guest CTAs show when truly signed out. */
  const isAuthenticated = authSession.isAuthenticated;

  const base = resolveNestPublicOrigin();
  let allItems: PublicJobListItem[] = [];
  let taxonomy: PublicJobTaxonomyResponse = emptyTaxonomy;
  let cmsHomeDiscovery: Awaited<
    ReturnType<typeof fetchCmsHomeJobsDiscovery>
  > = null;

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
    }
    if (taxRes.ok) {
      taxonomy = taxRes.data;
    }
  }

  const categorySpotlightTiles = cmsHomeDiscovery?.categorySpotlights.length
    ? buildCmsCategorySpotlightTiles(cmsHomeDiscovery.categorySpotlights)
    : [];

  const citySpotlightTiles = cmsHomeDiscovery?.citySpotlights.length
    ? buildCmsCitySpotlightTiles(cmsHomeDiscovery.citySpotlights)
    : [];

  const featuredJobs = allItems.filter((j) => j.featured).slice(0, 6);
  const featuredIds = new Set(featuredJobs.map((j) => j.id));
  const moreOpeningJobs = allItems
    .filter((j) => !featuredIds.has(j.id))
    .slice(0, 12);

  const heroSearchAction = `/${locale}/jobs`;
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
      {/* Hero Section */}
      <section className="relative overflow-hidden pb-16 pt-12 md:pb-32 md:pt-28">
        {/* Decorative gradient orbs - more visible */}
        <div
          className="hf-hero-orb -left-24 -top-24 size-[600px] bg-primary/40"
          aria-hidden
        />
        <div
          className="hf-hero-orb -right-16 top-12 size-[500px] bg-cyan-400/30"
          aria-hidden
        />
        <div
          className="hf-hero-orb -bottom-20 left-1/4 size-[450px] bg-emerald-400/25"
          aria-hidden
        />

        <div className="relative mx-auto max-w-6xl px-4">
          {promoBanner ? (
            <aside className="mb-8 inline-block">
              <Link
                href={promoBanner.href}
                locale={locale}
                className="inline-flex items-center gap-2 rounded-full bg-primary/[0.08] px-4 py-2 text-sm font-medium text-primary no-underline transition-colors hover:bg-primary/[0.12]"
              >
                {promoBanner.text}
              </Link>
            </aside>
          ) : null}

          {/* Hero card container (JoinBrands-style) */}
          <div className="rounded-3xl border border-border/40 bg-card/70 px-5 py-8 backdrop-blur-sm md:px-14 md:py-16">
            <header className="max-w-3xl">
              <h1 className="m-0 text-[clamp(2rem,7.2vw,3.75rem)] font-extrabold leading-[1.08] tracking-tight text-foreground">
                {t('headline').replace(t('headlineAccent'), '').trim()}{' '}
                <span className="hf-gradient-text">{t('headlineAccent')}</span>
              </h1>
              <p className="m-0 mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground md:mt-5 md:text-xl">
                {t('subhead')}
              </p>
            </header>

            <HomeHeroSearch action={heroSearchAction} taxonomy={taxonomy} isAuthenticated={isAuthenticated} />
          </div>
        </div>
      </section>

      {/* Content sections */}
      <div className="mx-auto max-w-6xl space-y-14 px-4 pb-20 md:space-y-28">
        {/* Job listing sections grouped with tighter spacing */}
        <div className="space-y-12">
          <HomeFeaturedJobsStrip
            locale={locale}
            items={featuredJobs}
            title={t('featuredSpotlightTitle')}
            subtitle={t('featuredSpotlightSubtitle')}
            viewAllLabel={t('viewAllJobs')}
            featuredRibbonLabel={featuredRibbonLabel}
            isAuthenticated={isAuthenticated}
          />

          <HomePopularJobsStrip
            locale={locale}
            items={moreOpeningJobs}
            title={t('moreListingsTitle')}
            featuredRibbonLabel={featuredRibbonLabel}
            isAuthenticated={isAuthenticated}
          />

          <HomeRecentJobsStrip
            locale={locale}
            featuredRibbonLabel={featuredRibbonLabel}
            isAuthenticated={isAuthenticated}
          />
        </div>

        <HomeSpotlightRail
          title={t('spotlightCategoriesTitle')}
          titleAccent={t('spotlightCategoriesAccent')}
          subtitle={t('spotlightCategoriesSubtitle')}
          tiles={categorySpotlightTiles}
          exploreLabelPrefix={t('spotlightExplorePrefix')}
          isAuthenticated={isAuthenticated}
        />

        <HomeSpotlightRail
          title={t('spotlightCitiesTitle')}
          titleAccent={t('spotlightCitiesAccent')}
          subtitle={t('spotlightCitiesSubtitle')}
          tiles={citySpotlightTiles}
          initialOpenIndex={Math.max(0, citySpotlightTiles.length - 1)}
          exploreLabelPrefix={t('spotlightExplorePrefix')}
          isAuthenticated={isAuthenticated}
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

        {!isAuthenticated && <HomeAudiencePaths locale={locale} t={audienceDict} />}
      </div>
    </main>
  );
}
