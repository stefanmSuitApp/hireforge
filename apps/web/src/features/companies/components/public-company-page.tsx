import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { ArrowRight, Check } from 'lucide-react';

import { CompanyInitials } from '@/components/company-initials';
import { JsonLd } from '@/components/json-ld';
import { GuestBrowseCta } from '@/features/jobs/components/guest-browse-cta';
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

  const { company, jobs, totalJobs } = result.data;
  const branding = await fetchCmsEmployerBranding(company.slug, locale);

  const origin = absoluteSiteOrigin();
  const pageUrl = `${origin}/${locale}/companies/${company.slug}`;
  const tNav = await getTranslations('Nav');
  const benefits = (branding?.benefits ?? [])
    .map((b) => b.title?.trim())
    .filter((title): title is string => Boolean(title));
  const testimonials = (branding?.testimonials ?? [])
    .filter((x) => x.quote?.trim())
    .slice(0, 3);

  return (
    <main className="mx-auto max-w-6xl px-4 pt-6 pb-16 md:pt-8 md:pb-20">
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
          className="mb-4 inline-block font-semibold text-primary no-underline hover:underline"
        >
          {t(backLabelKey)}
        </Link>
      ) : null}
      <header className="overflow-hidden rounded-[32px] border border-border bg-card">
        {/* Cover band until companies have cover photos (plan step 6). */}
        <div
          aria-hidden
          className="h-32 bg-gradient-to-br from-placeholder to-featured-soft md:h-56"
        />
        <div className="flex flex-wrap items-end justify-between gap-5 px-6 pb-7 md:px-8 md:pb-8">
          <div className="min-w-0">
            <CompanyInitials
              name={company.name}
              slug={company.slug}
              className="-mt-12 size-24 rounded-[26px] border border-border bg-card text-2xl shadow-[0_16px_36px_-20px_oklch(0.34_0.06_182_/_0.6)] md:-mt-14 md:size-28"
            />
            <h1 className="m-0 mt-4 text-[clamp(2rem,4.5vw,3rem)] font-extrabold leading-[1.08] tracking-tight text-foreground">
              {company.name}
            </h1>
            {branding?.heroHeadline ? (
              <p className="m-0 mt-2 text-lg font-semibold text-foreground">
                {branding.heroHeadline}
              </p>
            ) : null}
            {branding?.heroSubhead ? (
              <p className="m-0 mt-1.5 max-w-3xl text-base leading-relaxed text-muted-foreground">
                {branding.heroSubhead}
              </p>
            ) : null}
          </div>
          <span className="rounded-full bg-accent px-4 py-2.5 font-bold text-accent-foreground">
            {t('openJobsCount', { count: totalJobs })}
          </span>
        </div>
      </header>

      {benefits.length > 0 || testimonials.length > 0 ? (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {benefits.length > 0 ? (
            <section className="hf-reveal rounded-[24px] border border-border bg-card p-7">
              <h2 className="m-0 mb-3 text-[1.375rem] font-extrabold text-foreground">
                {t('whyJoin')}
              </h2>
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                {benefits.map((title) => (
                  <li
                    key={title}
                    className="flex gap-2.5 leading-relaxed text-foreground"
                  >
                    <Check
                      className="mt-1 size-4 shrink-0 text-primary"
                      aria-hidden
                    />
                    {title}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {testimonials.length > 0 ? (
            <section className="hf-reveal rounded-[24px] bg-featured-soft p-7">
              <h2 className="m-0 mb-3 text-[1.375rem] font-extrabold text-featured-soft-foreground">
                {t('testimonials')}
              </h2>
              <div className="flex flex-col gap-5">
                {testimonials.map((x, idx) => (
                  <blockquote
                    key={`${x.attribution ?? 'quote'}-${idx}`}
                    className="m-0"
                  >
                    <p className="m-0 text-lg leading-relaxed text-foreground">
                      „{x.quote}“
                    </p>
                    {x.attribution ? (
                      <footer className="mt-2 text-sm text-muted-foreground">
                        — {x.attribution}
                        {x.role ? `, ${x.role}` : ''}
                      </footer>
                    ) : null}
                  </blockquote>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {jobs.length === 0 ? (
        <div className="mt-10 rounded-[24px] border border-dashed border-border bg-muted/40 px-6 py-10 text-center">
          <h2 className="m-0 mb-2 text-lg font-bold text-foreground">
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
          className="mt-12"
        >
          <h2
            id="company-open-jobs-heading"
            className="m-0 text-[1.875rem] font-extrabold tracking-tight text-foreground"
          >
            {t('snapshotOpenJobs')}
          </h2>
          <ul className="m-0 mt-5 flex list-none flex-col gap-3 p-0">
            {jobs.map((job) => {
              const cityLabel =
                job.city == null
                  ? null
                  : locale === 'en' && job.city.nameEn
                    ? job.city.nameEn
                    : job.city.nameSr;
              const category =
                job.category == null
                  ? null
                  : locale === 'en' && job.category.nameEn
                    ? job.category.nameEn
                    : job.category.nameSr;

              return (
                <li key={job.id} className="hf-reveal">
                  <article className="hf-lift group relative flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-border bg-card px-6 py-5">
                    <div className="min-w-0">
                      <h3 className="m-0 text-lg font-bold leading-snug text-foreground">
                        <Link
                          href={`/jobs/${publicJobUrlSegment(job)}`}
                          locale={locale}
                          className="text-inherit no-underline after:absolute after:inset-0 after:rounded-[20px] group-hover:text-primary"
                        >
                          {job.title}
                        </Link>
                      </h3>
                      <p className="m-0 mt-1 text-sm leading-snug text-muted-foreground">
                        {cityLabel ? cityLabel : t('locationUnknown')}
                        {category ? ` · ${category}` : ''}
                        {` · ${t('publishedLabel')} ${formatPublished(job.publishedAt, locale)}`}
                      </p>
                    </div>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-accent px-3 py-1 text-[0.8125rem] font-semibold text-accent-foreground">
                        {jobEnumLabel(tEnum, 'workModel', job.workModel)}
                      </span>
                      <span className="rounded-full bg-muted px-3 py-1 text-[0.8125rem] font-medium text-muted-foreground">
                        {jobEnumLabel(
                          tEnum,
                          'employmentType',
                          job.employmentType,
                        )}
                      </span>
                      <span className="rounded-full bg-muted px-3 py-1 text-[0.8125rem] font-medium text-muted-foreground">
                        {jobEnumLabel(tEnum, 'seniority', job.seniority)}
                      </span>
                      <ArrowRight
                        className="ml-1 size-4 text-primary transition-transform duration-200 group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </span>
                  </article>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {/* Guests see the first 20 jobs of a company. */}
      {jobs.length < totalJobs ? (
        <GuestBrowseCta
          total={totalJobs}
          locale={locale}
          returnToPath={`/companies/${company.slug}`}
          className="mt-6"
        />
      ) : null}
    </main>
  );
}
