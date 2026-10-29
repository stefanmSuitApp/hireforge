import { getLocale, getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import {
  fetchCmsHomeJobsDiscovery,
  fetchCmsSiteSettings,
} from '@/lib/cms-content';
import { topLandingLinks } from '@/features/jobs/lib/landing';
import {
  buildCmsCategorySpotlightTiles,
  buildCmsCitySpotlightTiles,
} from '@/lib/home-jobs-discovery';
import { resolveNestPublicOrigin } from '@/lib/nest-api-url';
import { fetchPublicJobTaxonomy, fetchPublicSitemap } from '@/lib/public-jobs';

import { Link } from '@/i18n/navigation';
import { absoluteSiteOrigin } from '@/lib/site-origin';

import { BrandWordmark } from './brand-wordmark';

const emptyTaxonomy = { cities: [], categories: [] };

async function footerLandingLinks(locale: string) {
  const base = resolveNestPublicOrigin();
  const none = { cities: [], categories: [], taxonomy: emptyTaxonomy };
  if (!base) return none;
  const [taxonomy, live] = await Promise.all([
    fetchPublicJobTaxonomy(base),
    fetchPublicSitemap(base),
  ]);
  if (!taxonomy.ok || !live.ok) return none;
  return {
    ...topLandingLinks(locale, taxonomy.data, live.data.facets),
    taxonomy: taxonomy.data,
  };
}

export async function SiteFooter() {
  const locale = await getLocale();
  const t = await getTranslations('Footer');
  const navT = await getTranslations('Nav');
  const [siteSettings, discovery] = await Promise.all([
    fetchCmsSiteSettings(locale),
    fetchCmsHomeJobsDiscovery(locale),
  ]);
  // CMS spotlights first; else the places / fields with the most live jobs.
  const live = await footerLandingLinks(locale);
  const cityTiles = discovery?.citySpotlights?.length
    ? buildCmsCitySpotlightTiles(
        discovery.citySpotlights,
        live.taxonomy.cities,
      ).slice(0, 8)
    : live.cities.map((l) => ({
        slug: l.href,
        label: l.label,
        jobsHref: l.href,
      }));
  const categoryTiles = discovery?.categorySpotlights?.length
    ? buildCmsCategorySpotlightTiles(
        discovery.categorySpotlights,
        live.taxonomy.categories,
      ).slice(0, 8)
    : live.categories.map((l) => ({
        slug: l.href,
        label: l.label,
        jobsHref: l.href,
      }));
  const brandText = navT('brand');

  return (
    <footer className="mt-auto border-t border-border bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-6">
          <div className="sm:col-span-2 lg:col-span-1">
            <BrandWordmark text={brandText} size="sm" />
            <p className="m-0 mt-2 text-xs text-muted-foreground">
              {t('copyright')}
            </p>
            {/* The domain spells the brand without "Š", as people search it. */}
            {/* Masked in screenshots: the e2e host differs per checkout. */}
            <p
              className="m-0 mt-1 text-xs text-muted-foreground"
              data-visual-mask
            >
              {new URL(absoluteSiteOrigin()).host}
            </p>
            {siteSettings?.footerTagline?.trim() ? (
              <p className="m-0 mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground/90">
                {siteSettings.footerTagline}
              </p>
            ) : null}
          </div>

          <div>
            <h2 className="m-0 mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('columnDiscover')}
            </h2>
            <ul className="m-0 flex list-none flex-col gap-0 p-0 md:gap-2">
              <li>
                <Link
                  href="/jobs"
                  locale={locale}
                  className="inline-flex min-h-11 items-center text-sm md:min-h-0 font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {t('linkJobs')}
                </Link>
              </li>
              <li>
                <Link
                  href="/employers"
                  locale={locale}
                  className="inline-flex min-h-11 items-center text-sm md:min-h-0 font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {t('linkEmployers')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="m-0 mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('columnJobSeekers')}
            </h2>
            <ul className="m-0 flex list-none flex-col gap-0 p-0 md:gap-2">
              <li>
                <Link
                  href="/sign-in"
                  locale={locale}
                  className="inline-flex min-h-11 items-center text-sm md:min-h-0 font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {t('candidateSignIn')}
                </Link>
              </li>
              <li>
                <Link
                  href="/candidate/register"
                  locale={locale}
                  className="inline-flex min-h-11 items-center text-sm md:min-h-0 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {t('candidateRegister')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="m-0 mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('columnEmployers')}
            </h2>
            <ul className="m-0 flex list-none flex-col gap-0 p-0 md:gap-2">
              <li>
                <Link
                  href="/sign-in"
                  locale={locale}
                  className="inline-flex min-h-11 items-center text-sm md:min-h-0 font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {t('employerSignIn')}
                </Link>
              </li>
              <li>
                <Link
                  href="/employer/register"
                  locale={locale}
                  className="inline-flex min-h-11 items-center text-sm md:min-h-0 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {t('employerRegister')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="m-0 mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('columnCities')}
            </h2>
            {cityTiles.length ? (
              <ul className="m-0 flex list-none flex-col gap-0 p-0 md:gap-2">
                {cityTiles.map((tile) => (
                  <li key={tile.slug}>
                    <Link
                      href={tile.jobsHref}
                      locale={locale}
                      className="inline-flex min-h-11 items-center text-sm md:min-h-0 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {tile.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 text-sm text-muted-foreground">
                {t('listFallback')}
              </p>
            )}
          </div>

          <div>
            <h2 className="m-0 mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('columnCategories')}
            </h2>
            {categoryTiles.length ? (
              <ul className="m-0 flex list-none flex-col gap-0 p-0 md:gap-2">
                {categoryTiles.map((tile) => (
                  <li key={tile.slug}>
                    <Link
                      href={tile.jobsHref}
                      locale={locale}
                      className="inline-flex min-h-11 items-center text-sm md:min-h-0 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {tile.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 text-sm text-muted-foreground">
                {t('listFallback')}
              </p>
            )}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border/60 pt-8 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          {/* `/integration` is a dev-only diagnostics page (404 elsewhere). */}
          {process.env.NODE_ENV === 'development' ? (
            <Button
              variant="link"
              size="sm"
              className="h-auto justify-start p-0 text-xs text-muted-foreground"
              asChild
            >
              <Link href="/integration" locale={locale}>
                {t('integration')}
              </Link>
            </Button>
          ) : null}
          <p className="m-0 text-xs text-muted-foreground">
            <Link
              href="/moderator/login"
              locale={locale}
              className="underline-offset-2 hover:text-foreground hover:underline"
            >
              {t('moderatorPortal')}
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
