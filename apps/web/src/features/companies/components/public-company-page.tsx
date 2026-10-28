import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { JsonLd } from '@/components/json-ld';
import { LockedJobsCta } from '@/features/jobs/components/locked-jobs-cta';
import { jobEnumLabel } from '@/features/jobs/lib/job-enum-label';
import { Link } from '@/i18n/navigation';
import { breadcrumbJsonLd, companyJsonLd } from '@/lib/seo/json-ld';
import { absoluteSiteOrigin } from '@/lib/site-origin';
import { fetchCmsEmployerBranding } from '@/lib/cms-content';
import { publicJobUrlSegment } from '@/lib/job-public-segment';
import { resolveNestPublicOrigin } from '@/lib/nest-api-url';
import {
  fetchPublicCompanyDetail,
  isPublicApiOutage,
  PublicApiUnavailableError,
} from '@/lib/public-jobs';

type Props = {
  locale: string;
  slug: string;
  backHref?: string;
  /** Label key under `Company` when `backHref` is shown. */
  backLabelKey?: 'backToJobs' | 'backToEmployers';
};

function formatPublished(iso: string | null, locale: string): string {
  if (!iso) return '—';
  const loc = locale === 'sr' ? 'sr-Latn-RS' : 'en-GB';
  try {
    return new Intl.DateTimeFormat(loc, { dateStyle: 'medium' }).format(
      new Date(iso),
    );
  } catch {
    return iso;
  }
}

export async function PublicCompanyPage({
  locale,
  slug,
  backHref,
  backLabelKey = 'backToJobs',
}: Props) {
  const t = await getTranslations('Company');
  const tEnum = await getTranslations('Enums');
  const base = resolveNestPublicOrigin();

  if (!base) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12 pb-16 md:py-14">
        <div className="rounded-xl border border-dashed border-destructive/30 bg-destructive-soft px-6 py-10 text-center">
          {t('errorNoApi')}
        </div>
      </main>
    );
  }

  const result = await fetchPublicCompanyDetail(base, slug);
  if (!result.ok) {
    if (result.status === 404 || result.status === 400) {
      notFound();
    }
    if (isPublicApiOutage(result)) {
      throw new PublicApiUnavailableError('company', result);
    }
    const msg = t('errorGeneric');
    return (
      <main className="mx-auto max-w-5xl px-4 py-12 pb-16 md:py-14">
        <div className="rounded-xl border border-dashed border-destructive/30 bg-destructive-soft px-6 py-10 text-center">
          {msg}
        </div>
      </main>
    );
  }

  const { company, jobs, lockedJobCount } = result.data;
  const branding = await fetchCmsEmployerBranding(company.slug, locale);

  const origin = absoluteSiteOrigin();
  const pageUrl = `${origin}/${locale}/companies/${company.slug}`;
  const tNav = await getTranslations('Nav');

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 pb-16 md:py-14">
      <JsonLd
        data={[
          companyJsonLd({ name: company.name, pageUrl }),
          breadcrumbJsonLd([
            { name: tNav('home'), url: `${origin}/${locale}` },
            { name: tNav('employer'), url: `${origin}/${locale}/employers` },
            { name: company.name, url: pageUrl },
          ]),
        ]}
      />
      {backHref ? (
        <Link
          href={backHref}
          locale={locale}
          className="mb-4 inline-block text-sm text-muted-foreground underline underline-offset-2 hover:text-primary"
        >
          {t(backLabelKey)}
        </Link>
      ) : null}
      <header className="mb-6">
        <h1 className="m-0 text-h1 text-foreground">{company.name}</h1>
        {branding?.heroHeadline ? (
          <p className="mt-2 text-base font-medium text-foreground">
            {branding.heroHeadline}
          </p>
        ) : null}
        {branding?.heroSubhead ? (
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            {branding.heroSubhead}
          </p>
        ) : null}
        <p className="mt-2 text-sm text-muted-foreground">
          {t('openJobsCount', { count: jobs.length + lockedJobCount })}
        </p>
      </header>

      {branding &&
      ((branding.benefits && branding.benefits.length > 0) ||
        (branding.testimonials && branding.testimonials.length > 0)) ? (
        <section className="mb-8 rounded-xl border border-border bg-card p-4 shadow-sm">
          {branding.benefits && branding.benefits.length > 0 ? (
            <>
              <h2 className="m-0 mb-3 text-lg font-semibold text-foreground">
                {t('whyJoin')}
              </h2>
              <ul className="m-0 mb-4 list-disc space-y-1 pl-5 text-sm text-foreground">
                {branding.benefits
                  .map((b) => b.title?.trim())
                  .filter(Boolean)
                  .map((title) => (
                    <li key={title}>{title}</li>
                  ))}
              </ul>
            </>
          ) : null}
          {branding.testimonials && branding.testimonials.length > 0 ? (
            <div className="space-y-3">
              <h3 className="m-0 text-base font-semibold text-foreground">
                {t('testimonials')}
              </h3>
              {branding.testimonials
                .filter((x) => x.quote?.trim())
                .slice(0, 3)
                .map((x, idx) => (
                  <blockquote
                    key={`${x.attribution ?? 'quote'}-${idx}`}
                    className="m-0 border-l-2 border-primary/40 pl-3 text-sm text-foreground"
                  >
                    <p className="m-0">"{x.quote}"</p>
                    {x.attribution ? (
                      <footer className="mt-1 text-xs text-muted-foreground">
                        — {x.attribution}
                        {x.role ? `, ${x.role}` : ''}
                      </footer>
                    ) : null}
                  </blockquote>
                ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {jobs.length === 0 && lockedJobCount > 0 ? null : jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/50 px-6 py-10 text-center">
          <h2 className="m-0 mb-2 text-lg font-semibold text-foreground">
            {t('emptyTitle')}
          </h2>
          <p className="m-0 mx-auto max-w-md text-[0.9375rem] text-muted-foreground">
            {t('emptyBody')}
          </p>
        </div>
      ) : (
        <section
          id="company-open-jobs"
          aria-labelledby="company-open-jobs-heading"
        >
          <h2
            id="company-open-jobs-heading"
            className="m-0 mb-3 text-lg font-semibold text-foreground"
          >
            {t('snapshotOpenJobs')}
          </h2>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {jobs.map((job) => {
              const city =
                job.city == null
                  ? null
                  : locale === 'en' && job.city.nameEn
                    ? job.city.nameEn
                    : job.city.nameSr;
              const cityLabel =
                city == null
                  ? null
                  : job.city?.postalCode
                    ? `${city} (${job.city.postalCode})`
                    : city;
              const category =
                job.category == null
                  ? null
                  : locale === 'en' && job.category.nameEn
                    ? job.category.nameEn
                    : job.category.nameSr;

              return (
                <li key={job.id}>
                  <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <h3 className="m-0 mb-1 text-[1.0625rem] font-semibold leading-snug text-foreground">
                      <Link
                        href={`/jobs/${publicJobUrlSegment(job)}`}
                        locale={locale}
                        className="text-inherit no-underline hover:text-primary hover:underline hover:underline-offset-2"
                      >
                        {job.title}
                      </Link>
                    </h3>
                    <p className="m-0 text-sm leading-snug text-muted-foreground">
                      {cityLabel ? cityLabel : t('locationUnknown')}
                      {category ? ` · ${category}` : ''}
                    </p>
                    <p className="m-0 text-sm leading-snug text-muted-foreground">
                      {t('publishedLabel')}{' '}
                      {formatPublished(job.publishedAt, locale)}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground">
                        {jobEnumLabel(tEnum, 'workModel', job.workModel)}
                      </span>
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground">
                        {jobEnumLabel(
                          tEnum,
                          'employmentType',
                          job.employmentType,
                        )}
                      </span>
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground">
                        {jobEnumLabel(tEnum, 'seniority', job.seniority)}
                      </span>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <LockedJobsCta
        count={lockedJobCount}
        locale={locale}
        returnToPath={`/companies/${company.slug}`}
        className="mt-6"
      />
    </main>
  );
}
