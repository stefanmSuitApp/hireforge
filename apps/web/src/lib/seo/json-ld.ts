import type { PublicJobDetailResponse } from 'contracts';
import type {
  BreadcrumbList,
  JobPosting,
  Organization,
  WebSite,
  WithContext,
} from 'schema-dts';

import { SITE_NAME } from '@/i18n/metadata';

/**
 * Structured data (schema.org JSON-LD) for public pages. Builders return
 * plain objects (`null` when nothing should be emitted); `<JsonLd>` renders
 * them. Google's JobPosting guidelines:
 * https://developers.google.com/search/docs/appearance/structured-data/job-posting
 */

/** People type the name without "Š"; search engines should connect both. */
export const BRAND_ALTERNATE_NAMES = ['Sljakam', 'sljakam.com'];

/** TODO(Stefan): official social profile URLs for `sameAs` (NEEDS_STEFAN.md). */
const SOCIAL_PROFILES: string[] = [];

export function organizationJsonLd(origin: string): WithContext<Organization> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${origin}/#organization`,
    name: SITE_NAME,
    alternateName: BRAND_ALTERNATE_NAMES,
    url: origin,
    logo: `${origin}/icon.png`,
    ...(SOCIAL_PROFILES.length ? { sameAs: SOCIAL_PROFILES } : {}),
  };
}

export function websiteJsonLd(
  origin: string,
  locale: string,
): WithContext<WebSite> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${origin}/#website`,
    name: SITE_NAME,
    alternateName: BRAND_ALTERNATE_NAMES,
    url: `${origin}/${locale}`,
    inLanguage: locale,
    publisher: { '@id': `${origin}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${origin}/${locale}/jobs?q={search_term_string}`,
      },
      // schema-dts has no type for the `-input` property Google reads.
      ...({ 'query-input': 'required name=search_term_string' } as object),
    },
  };
}

const EMPLOYMENT_TYPE: Record<string, string> = {
  full_time: 'FULL_TIME',
  part_time: 'PART_TIME',
  contract: 'CONTRACTOR',
  internship: 'INTERN',
  temporary: 'TEMPORARY',
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Plain-text description as minimal HTML (paragraphs, line breaks). */
function plainToHtml(text: string): string {
  return text
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/**
 * JobPosting for a live job; `null` for an ended ad (Google requires removing
 * the markup once a job is no longer open). `jobUrl` is the canonical page.
 */
export function jobPostingJsonLd(
  job: PublicJobDetailResponse,
  ctx: { origin: string; locale: string; jobUrl: string; companyUrl: string },
): WithContext<JobPosting> | null {
  if (!job.live || !job.publishedAt) return null;

  const remote = job.workModel === 'remote';
  const city = job.city
    ? ctx.locale === 'en'
      ? (job.city.nameEn ?? job.city.nameSr)
      : job.city.nameSr
    : null;
  const employmentType = EMPLOYMENT_TYPE[job.employmentType];

  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.descriptionHtml?.trim()
      ? job.descriptionHtml
      : plainToHtml(job.description || job.title),
    datePosted: job.publishedAt,
    ...(job.expiresAt ? { validThrough: job.expiresAt } : {}),
    ...(employmentType ? { employmentType } : {}),
    url: ctx.jobUrl,
    identifier: {
      '@type': 'PropertyValue',
      name: SITE_NAME,
      value: job.shortId ?? job.id,
    },
    // `url`/`sameAs` would claim the company's own website, which we don't
    // store; `@id` ties it to the Organization on its Šljakam page.
    hiringOrganization: {
      '@type': 'Organization',
      '@id': `${ctx.companyUrl}#organization`,
      name: job.company.name,
    },
    // Google wants a jobLocation unless the job is fully remote; hybrid jobs
    // have one. Without a city the country alone still places it.
    ...(remote
      ? {
          jobLocationType: 'TELECOMMUTE',
          applicantLocationRequirements: { '@type': 'Country', name: 'RS' },
        }
      : {}),
    ...(!remote || city
      ? {
          jobLocation: {
            '@type': 'Place',
            address: {
              '@type': 'PostalAddress',
              ...(city ? { addressLocality: city } : {}),
              ...(job.city?.postalCode
                ? { postalCode: job.city.postalCode }
                : {}),
              addressCountry: 'RS',
            },
          },
        }
      : {}),
    directApply: job.applyMode === 'internal',
    // baseSalary: no salary fields yet (Phase C adds them).
  };
}

export function breadcrumbJsonLd(
  items: Array<{ name: string; url: string }>,
): WithContext<BreadcrumbList> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** The company on its Šljakam page (`pageUrl`), not its own website. */
export function companyJsonLd(company: {
  name: string;
  pageUrl: string;
}): WithContext<Organization> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${company.pageUrl}#organization`,
    name: company.name,
    mainEntityOfPage: company.pageUrl,
  };
}

/** Safe inside `<script>`: no `</script>` or HTML comment can close it. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}
