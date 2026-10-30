import { getLocale, getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import {
  fetchCmsHomeJobsDiscovery,
  fetchCmsSiteSettings,
  type LegalPageKind,
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

import { AnalyticsConsentSettingsButton } from './analytics-consent';
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

export async function SiteFooter({
  legal,
  analyticsConsent,
}: {
  /** Published legal pages, in display order. */
  legal: readonly LegalPageKind[];
  /** Clarity is configured: offer a way to change the choice. */
  analyticsConsent: boolean;
}) {
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
    <footer className="mt-auto bg-footer text-footer-foreground">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-9">
        <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-6">
          <div className="sm:col-span-2 lg:col-span-1">
            {/* Solid on the teal band: the gradient wordmark would vanish. */}
            <BrandWordmark
              text={brandText}
              size="sm"
              className="bg-none text-footer-foreground"
            />
            <p className="m-0 mt-2 text-xs text-footer-foreground/85">
              {t('copyright')}
            </p>
            {/* The domain spells the brand without "Š", as people search it. */}
            {/* Masked in screenshots: the e2e host differs per checkout. */}
            <p
              className="m-0 mt-1 text-xs text-footer-foreground/85"
              data-visual-mask
            >
              {new URL(absoluteSiteOrigin()).host}
            </p>
            {siteSettings?.footerTagline?.trim() ? (
              <p className="m-0 mt-2 max-w-xs text-sm leading-relaxed text-footer-foreground/90">
                {siteSettings.footerTagline}
              </p>
            ) : null}
          </div>

          <div>
            <h2 className="m-0 mb-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-featured">
              {t('columnDiscover')}
            </h2>
            <ul className="m-0 flex list-none flex-col gap-0 p-0 md:gap-1.5">
              <li>
                <Link
                  href="/jobs"
                  locale={locale}
                  className="inline-flex min-h-11 items-center text-sm md:min-h-0 font-medium text-footer-foreground underline-offset-4 hover:underline"
                >
                  {t('linkJobs')}
                </Link>
              </li>
              <li>
                <Link
                  href="/employers"
                  locale={locale}
                  className="inline-flex min-h-11 items-center text-sm md:min-h-0 font-medium text-footer-foreground underline-offset-4 hover:underline"
                >
                  {t('linkEmployers')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="m-0 mb-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-featured">
              {t('columnJobSeekers')}
            </h2>
            <ul className="m-0 flex list-none flex-col gap-0 p-0 md:gap-1.5">
              <li>
                <Link
                  href="/sign-in"
                  locale={locale}
                  className="inline-flex min-h-11 items-center text-sm md:min-h-0 font-medium text-footer-foreground underline-offset-4 hover:underline"
                >
                  {t('candidateSignIn')}
                </Link>
              </li>
              <li>
                <Link
                  href="/candidate/register"
                  locale={locale}
                  className="inline-flex min-h-11 items-center text-sm md:min-h-0 text-footer-foreground/85 underline-offset-4 hover:text-footer-foreground hover:underline"
                >
                  {t('candidateRegister')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="m-0 mb-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-featured">
              {t('columnEmployers')}
            </h2>
            <ul className="m-0 flex list-none flex-col gap-0 p-0 md:gap-1.5">
              <li>
                <Link
                  href="/sign-in"
                  locale={locale}
                  className="inline-flex min-h-11 items-center text-sm md:min-h-0 font-medium text-footer-foreground underline-offset-4 hover:underline"
                >
                  {t('employerSignIn')}
                </Link>
              </li>
              <li>
                <Link
                  href="/employer/register"
                  locale={locale}
                  className="inline-flex min-h-11 items-center text-sm md:min-h-0 text-footer-foreground/85 underline-offset-4 hover:text-footer-foreground hover:underline"
                >
                  {t('employerRegister')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="m-0 mb-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-featured">
              {t('columnCities')}
            </h2>
            {cityTiles.length ? (
              <ul className="m-0 flex list-none flex-col gap-0 p-0 md:gap-1.5">
                {cityTiles.map((tile) => (
                  <li key={tile.slug}>
                    <Link
                      href={tile.jobsHref}
                      locale={locale}
                      className="inline-flex min-h-11 items-center text-sm md:min-h-0 text-footer-foreground/85 underline-offset-4 hover:text-footer-foreground hover:underline"
                    >
                      {tile.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 text-sm text-footer-foreground/85">
                {t('listFallback')}
              </p>
            )}
          </div>

          <div>
            <h2 className="m-0 mb-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-featured">
              {t('columnCategories')}
            </h2>
            {categoryTiles.length ? (
              <ul className="m-0 flex list-none flex-col gap-0 p-0 md:gap-1.5">
                {categoryTiles.map((tile) => (
                  <li key={tile.slug}>
                    <Link
                      href={tile.jobsHref}
                      locale={locale}
                      className="inline-flex min-h-11 items-center text-sm md:min-h-0 text-footer-foreground/85 underline-offset-4 hover:text-footer-foreground hover:underline"
                    >
                      {tile.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 text-sm text-footer-foreground/85">
                {t('listFallback')}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-footer-foreground/15 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          {/* `/integration` is a dev-only diagnostics page (404 elsewhere). */}
          {process.env.NODE_ENV === 'development' ? (
            <Button
              variant="link"
              size="sm"
              className="h-auto justify-start p-0 text-xs text-footer-foreground/85"
              asChild
            >
              <Link href="/integration" locale={locale}>
                {t('integration')}
              </Link>
            </Button>
          ) : null}
          {legal.length || analyticsConsent ? (
            <nav aria-label={t('legalNav')}>
              <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-xs">
                {legal.map((kind) => (
                  <li key={kind}>
                    <Link
                      href={`/${kind}`}
                      locale={locale}
                      className="text-footer-foreground/85 underline-offset-2 hover:text-footer-foreground hover:underline"
                    >
                      {t(kind)}
                    </Link>
                  </li>
                ))}
                {analyticsConsent ? (
                  <li>
                    <AnalyticsConsentSettingsButton className="cursor-pointer text-footer-foreground/85 underline-offset-2 hover:text-footer-foreground hover:underline" />
                  </li>
                ) : null}
              </ul>
            </nav>
          ) : null}
          <p className="m-0 text-xs text-footer-foreground/85">
            <Link
              href="/moderator/login"
              locale={locale}
              className="underline-offset-2 hover:text-footer-foreground hover:underline"
            >
              {t('moderatorPortal')}
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
