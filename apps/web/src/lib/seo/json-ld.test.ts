import type { PublicJobDetailResponse } from 'contracts';
import { describe, expect, it } from 'vitest';

import {
  breadcrumbJsonLd,
  companyJsonLd,
  jobPostingJsonLd,
  organizationJsonLd,
  serializeJsonLd,
  websiteJsonLd,
} from './json-ld';

const ORIGIN = 'https://sljakam.com';
const ctx = {
  origin: ORIGIN,
  locale: 'sr',
  jobUrl: `${ORIGIN}/sr/jobs/react-developer-beograd-ab12`,
  companyUrl: `${ORIGIN}/sr/companies/devlegion`,
};

function job(
  over: Partial<PublicJobDetailResponse> = {},
): PublicJobDetailResponse {
  return {
    id: '20000000-0000-4000-8000-000000000001',
    title: 'React developer',
    description: 'Gradimo proizvod.\n\nHibridno, Beograd.',
    descriptionHtml: null,
    slug: 'react-developer-beograd-ab12',
    shortId: 'ab12',
    applyMode: 'internal',
    externalApplyUrl: null,
    primaryLanguage: 'sr',
    featured: false,
    crossborderVisible: false,
    pngCreativeUrl: null,
    salary: null,
    publishedAt: '2026-10-01T08:00:00.000Z',
    expiresAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-10-02T08:00:00.000Z',
    live: true,
    workModel: 'hybrid',
    employmentType: 'full_time',
    seniority: 'mid',
    company: { slug: 'devlegion', name: 'DEVLEGION d.o.o.' },
    city: {
      slug: 'beograd',
      nameSr: 'Beograd',
      nameEn: 'Belgrade',
      postalCode: '11000',
    },
    category: { slug: 'it', nameSr: 'IT', nameEn: 'IT' },
    ...over,
  };
}

/** Every leaf value; JSON-LD must never carry `undefined` or empty strings. */
function leaves(value: unknown): unknown[] {
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(leaves);
  }
  return [value];
}

describe('jobPostingJsonLd', () => {
  it("has Google's required and recommended properties", () => {
    const ld = jobPostingJsonLd(job(), ctx);
    expect(ld).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title: 'React developer',
      datePosted: '2026-10-01T08:00:00.000Z',
      validThrough: '2026-11-01T08:00:00.000Z',
      employmentType: 'FULL_TIME',
      directApply: true,
      url: ctx.jobUrl,
      identifier: { '@type': 'PropertyValue', value: 'ab12' },
      hiringOrganization: { '@type': 'Organization', name: 'DEVLEGION d.o.o.' },
      jobLocation: {
        '@type': 'Place',
        address: {
          addressLocality: 'Beograd',
          postalCode: '11000',
          addressCountry: 'RS',
        },
      },
    });
    expect(ld?.description).toBe(
      '<p>Gradimo proizvod.</p><p>Hibridno, Beograd.</p>',
    );
  });

  it('never leaks undefined or empty values', () => {
    for (const j of [
      job(),
      job({ expiresAt: null, city: null, shortId: null }),
      job({ workModel: 'remote', city: null, employmentType: 'other' }),
    ]) {
      const values = leaves(jobPostingJsonLd(j, ctx));
      expect(values).not.toContain(undefined);
      expect(values).not.toContain('');
      expect(JSON.stringify(jobPostingJsonLd(j, ctx))).not.toContain(
        'undefined',
      );
    }
  });

  it('marks remote jobs as telecommute with a country requirement', () => {
    const ld = jobPostingJsonLd(job({ workModel: 'remote', city: null }), ctx);
    expect(ld).toMatchObject({
      jobLocationType: 'TELECOMMUTE',
      applicantLocationRequirements: { '@type': 'Country', name: 'RS' },
    });
    expect(ld).not.toHaveProperty('jobLocation');
  });

  it('prefers the sanitized HTML description and English city names on /en', () => {
    const ld = jobPostingJsonLd(job({ descriptionHtml: '<p>HTML</p>' }), {
      ...ctx,
      locale: 'en',
    });
    expect(ld?.description).toBe('<p>HTML</p>');
    expect(JSON.stringify(ld)).toContain('"addressLocality":"Belgrade"');
  });

  it('external apply is not direct apply', () => {
    expect(
      jobPostingJsonLd(job({ applyMode: 'external' }), ctx)?.directApply,
    ).toBe(false);
  });

  it('carries the salary the employer entered, and none otherwise', () => {
    expect(jobPostingJsonLd(job(), ctx)).not.toHaveProperty('baseSalary');
    const range = jobPostingJsonLd(
      job({
        salary: { min: 60000, max: 80000, period: 'month', basis: 'net' },
      }),
      ctx,
    );
    expect(range?.baseSalary).toEqual({
      '@type': 'MonetaryAmount',
      currency: 'RSD',
      value: {
        '@type': 'QuantitativeValue',
        minValue: 60000,
        maxValue: 80000,
        unitText: 'MONTH',
      },
    });
    const hourly = jobPostingJsonLd(
      job({ salary: { min: 400, max: null, period: 'hour', basis: 'net' } }),
      ctx,
    );
    expect(hourly?.baseSalary).toEqual({
      '@type': 'MonetaryAmount',
      currency: 'RSD',
      value: { '@type': 'QuantitativeValue', minValue: 400, unitText: 'HOUR' },
    });
  });

  it('emits nothing for an ended or unpublished ad', () => {
    expect(jobPostingJsonLd(job({ live: false }), ctx)).toBeNull();
    expect(jobPostingJsonLd(job({ publishedAt: null }), ctx)).toBeNull();
  });
});

describe('site and page JSON-LD', () => {
  it('names the brand with and without the diacritic', () => {
    const org = organizationJsonLd(ORIGIN);
    expect(org).toMatchObject({
      name: 'Šljakam',
      alternateName: ['Sljakam', 'sljakam.com'],
      url: ORIGIN,
      logo: `${ORIGIN}/icon.png`,
    });
    expect(org).not.toHaveProperty('sameAs');
    expect(websiteJsonLd(ORIGIN, 'sr')).toMatchObject({
      url: `${ORIGIN}/sr`,
      potentialAction: {
        target: { urlTemplate: `${ORIGIN}/sr/jobs?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    });
  });

  it('numbers breadcrumbs from 1 and describes companies by their page', () => {
    expect(
      breadcrumbJsonLd([
        { name: 'Početna', url: `${ORIGIN}/sr` },
        { name: 'Poslovi', url: `${ORIGIN}/sr/jobs` },
      ]).itemListElement,
    ).toEqual([
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Početna',
        item: `${ORIGIN}/sr`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Poslovi',
        item: `${ORIGIN}/sr/jobs`,
      },
    ]);
    expect(
      companyJsonLd({ name: 'X', pageUrl: `${ORIGIN}/sr/companies/x` }),
    ).toMatchObject({ '@id': `${ORIGIN}/sr/companies/x#organization` });
  });

  it('serializes without anything that could close the script tag', () => {
    const out = serializeJsonLd({ t: '</script><!-- & -->' });
    expect(out).not.toMatch(/[<>&]/);
    expect(JSON.parse(out)).toEqual({ t: '</script><!-- & -->' });
  });
});
