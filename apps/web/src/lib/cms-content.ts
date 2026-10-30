import imageUrlBuilder from '@sanity/image-url';
import { unstable_cache } from 'next/cache';
import { createSanityReadClient } from 'shared';

import {
  type CmsPortableTextBody,
  pickLocalizedBody,
} from '@/lib/cms-localized-body';
import type { CmsDiscoverySpotlightRow } from '@/lib/home-jobs-discovery';

type CmsNavLink = {
  label: string;
  href: string;
  external?: boolean;
};

type CmsSiteSettings = {
  siteName?: string;
  footerTagline?: string;
};

type CmsEmployerBranding = {
  companySlug: string;
  heroHeadline?: string;
  heroSubhead?: string;
  benefits?: Array<{ title?: string }>;
  testimonials?: Array<{ quote?: string; attribution?: string; role?: string }>;
};

export type { CmsPortableTextBody };

function getSanityImageBuilder() {
  const projectId =
    process.env['SANITY_PROJECT_ID']?.trim() ||
    process.env['NEXT_PUBLIC_SANITY_PROJECT_ID']?.trim() ||
    '';
  const dataset =
    process.env['SANITY_DATASET']?.trim() ||
    process.env['NEXT_PUBLIC_SANITY_DATASET']?.trim() ||
    'production';
  if (!projectId) return null;
  return imageUrlBuilder({ projectId, dataset });
}

function getCmsClient() {
  const projectId =
    process.env['SANITY_PROJECT_ID']?.trim() ||
    process.env['NEXT_PUBLIC_SANITY_PROJECT_ID']?.trim() ||
    '';
  const dataset =
    process.env['SANITY_DATASET']?.trim() ||
    process.env['NEXT_PUBLIC_SANITY_DATASET']?.trim() ||
    'production';
  return createSanityReadClient({
    projectId,
    dataset,
    token: process.env['SANITY_API_READ_TOKEN']?.trim() || undefined,
  });
}

const fetchCmsNavigationCached = unstable_cache(
  async (locale: string): Promise<CmsNavLink[] | null> => {
    const client = getCmsClient();
    if (!client) return null;
    try {
      return await client.fetch<CmsNavLink[]>(
        `*[_type == "navigation" && _id in ["navigation", "drafts.navigation"]][0].items[]{
          "label": coalesce(label[$locale], label.sr, label.en),
          href,
          external
        }`,
        { locale },
      );
    } catch {
      return null;
    }
  },
  ['cms-navigation-v2'],
  { revalidate: 300, tags: ['cms:navigation'] },
);

const fetchCmsSiteSettingsCached = unstable_cache(
  async (locale: string): Promise<CmsSiteSettings | null> => {
    const client = getCmsClient();
    if (!client) return null;
    try {
      return await client.fetch<CmsSiteSettings>(
        `*[_type == "siteSettings" && _id in ["siteSettings", "drafts.siteSettings"]][0]{
          "siteName": coalesce(siteName[$locale], siteName.sr, siteName.en),
          "footerTagline": coalesce(footerTagline[$locale], footerTagline.sr, footerTagline.en)
        }`,
        { locale },
      );
    } catch {
      return null;
    }
  },
  ['cms-site-settings-v2'],
  { revalidate: 300, tags: ['cms:siteSettings'] },
);

export async function fetchCmsNavigation(
  locale: string,
): Promise<Array<{ label: string; href: string; external?: boolean }> | null> {
  const raw = await fetchCmsNavigationCached(locale);
  if (!raw) return null;
  const mapped = raw
    .map((item) => {
      return {
        label: item.label?.trim() || '',
        href: item.href,
        external: item.external,
      };
    })
    .filter((item) => item.label && item.href);
  return mapped.length > 0 ? mapped : null;
}

export async function fetchCmsSiteSettings(
  locale: string,
): Promise<CmsSiteSettings | null> {
  return fetchCmsSiteSettingsCached(locale);
}

export async function fetchCmsEmployerBranding(
  companySlug: string,
  locale: string,
): Promise<CmsEmployerBranding | null> {
  const client = getCmsClient();
  if (!client || !companySlug.trim()) return null;
  try {
    return await client.fetch<CmsEmployerBranding>(
      `*[_type == "employerBranding" && companySlug == $companySlug][0]{
        companySlug,
        "heroHeadline": coalesce(heroHeadline[$locale], heroHeadline.sr, heroHeadline.en),
        "heroSubhead": coalesce(heroSubhead[$locale], heroSubhead.sr, heroSubhead.en),
        "benefits": benefits[]{
          "title": coalesce(title[$locale], title.sr, title.en)
        },
        "testimonials": testimonials[]{
          "quote": coalesce(quote[$locale], quote.sr, quote.en),
          "attribution": coalesce(attribution[$locale], attribution.sr, attribution.en),
          "role": coalesce(role[$locale], role.sr, role.en)
        }
      }`,
      { companySlug, locale },
      {
        next: {
          revalidate: 300,
          tags: [`cms:employerBranding:${companySlug}`],
        },
      },
    );
  } catch {
    return null;
  }
}

/** Company slug → square logo URL, for every branding document with one. */
export type CmsEmployerLogos = Record<string, string>;

const fetchCmsEmployerLogosCached = unstable_cache(
  async (): Promise<CmsEmployerLogos> => {
    const client = getCmsClient();
    const builder = getSanityImageBuilder();
    if (!client || !builder) return {};
    try {
      const rows = await client.fetch<
        Array<{ companySlug: string | null; logo: Record<string, unknown> }>
      >(
        `*[_type == "employerBranding" && defined(logo.asset) && !(_id in path("drafts.**"))]{
          companySlug,
          logo
        }`,
      );
      const logos: CmsEmployerLogos = {};
      for (const row of rows) {
        if (!row.companySlug) continue;
        logos[row.companySlug] = builder
          .image(row.logo as never)
          .width(192)
          .height(192)
          .fit('crop')
          .auto('format')
          .url();
      }
      return logos;
    } catch {
      return {};
    }
  },
  ['cms-employer-logos'],
  { revalidate: 300, tags: ['cms:employerLogos'] },
);

export async function fetchCmsEmployerLogos(): Promise<CmsEmployerLogos> {
  return fetchCmsEmployerLogosCached();
}

export type CmsEditorialPage = {
  title: string | null;
  excerpt: string | null;
  body: CmsPortableTextBody | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

export async function fetchCmsEditorialPage(
  slug: string,
  locale: string,
): Promise<CmsEditorialPage | null> {
  const trimmed = slug.trim();
  if (!trimmed) return null;

  const cached = unstable_cache(
    async () => {
      const client = getCmsClient();
      if (!client) return null;
      try {
        const doc = await client.fetch<
          | (Omit<CmsEditorialPage, 'body'> & {
              body: Parameters<typeof pickLocalizedBody>[0];
            })
          | null
        >(
          `*[_type == "editorialPage" && slug.current == $slug][0]{
            "title": coalesce(title[$locale], title.sr, title.en),
            "excerpt": coalesce(excerpt[$locale], excerpt.sr, excerpt.en),
            body,
            "seoTitle": coalesce(seoTitle[$locale], seoTitle.sr, seoTitle.en),
            "seoDescription": coalesce(seoDescription[$locale], seoDescription.sr, seoDescription.en)
          }`,
          { slug: trimmed, locale },
        );
        return doc && { ...doc, body: pickLocalizedBody(doc.body, locale) };
      } catch {
        return null;
      }
    },
    ['cms-editorial-page', trimmed, locale],
    { revalidate: 300, tags: [`cms:editorialPage:${trimmed}`] },
  );

  const doc = await cached();
  if (!doc?.title?.trim()) return null;
  return doc;
}

export type CmsEditorialSlug = { slug: string; updatedAt: string | null };

/** Published editorial pages (for the sitemap). */
export const fetchCmsEditorialSlugs = unstable_cache(
  async (): Promise<CmsEditorialSlug[]> => {
    const client = getCmsClient();
    if (!client) return [];
    try {
      return await client.fetch<CmsEditorialSlug[]>(
        `*[_type == "editorialPage" && defined(slug.current) && !(_id in path("drafts.**"))]{
          "slug": slug.current,
          "updatedAt": _updatedAt
        }`,
      );
    } catch {
      return [];
    }
  },
  ['cms-editorial-slugs'],
  { revalidate: 3600 },
);

export const LEGAL_PAGE_KINDS = ['privacy', 'terms', 'refunds'] as const;
export type LegalPageKind = (typeof LEGAL_PAGE_KINDS)[number];

export type CmsLegalPage = {
  title: string | null;
  /** `YYYY-MM-DD`; also the version recorded when terms are accepted. */
  effectiveFrom: string | null;
  body: CmsPortableTextBody | null;
};

// Fixed ids, never `drafts.legal-*`: the read token can see drafts, and an
// unpublished legal text must not reach the site.
const legalId = (kind: LegalPageKind) => `legal-${kind}`;

export async function fetchCmsLegalPage(
  kind: LegalPageKind,
  locale: string,
): Promise<CmsLegalPage | null> {
  const cached = unstable_cache(
    async () => {
      const client = getCmsClient();
      if (!client) return null;
      try {
        const doc = await client.fetch<
          | (Omit<CmsLegalPage, 'body'> & {
              body: Parameters<typeof pickLocalizedBody>[0];
            })
          | null
        >(
          `*[_type == "legalPage" && _id == $id][0]{
            "title": coalesce(title[$locale], title.sr, title.en),
            effectiveFrom,
            body
          }`,
          { id: legalId(kind), locale },
        );
        return doc && { ...doc, body: pickLocalizedBody(doc.body, locale) };
      } catch {
        return null;
      }
    },
    ['cms-legal-page', kind, locale],
    { revalidate: 300, tags: [`cms:legalPage:${kind}`] },
  );

  const doc = await cached();
  if (!doc?.title?.trim() || !doc.body?.length) return null;
  return doc;
}

export type CmsLegalPageRef = {
  kind: LegalPageKind;
  effectiveFrom: string | null;
  updatedAt: string | null;
};

/** Published legal pages: footer links, sign-up notice, sitemap. */
export const fetchCmsPublishedLegalPages = unstable_cache(
  async (): Promise<CmsLegalPageRef[]> => {
    const client = getCmsClient();
    if (!client) return [];
    try {
      const rows = await client.fetch<
        Array<{ id: string; effectiveFrom: string | null; updatedAt: string }>
      >(
        `*[_type == "legalPage" && _id in $ids]{
          "id": _id,
          effectiveFrom,
          "updatedAt": _updatedAt
        }`,
        { ids: LEGAL_PAGE_KINDS.map(legalId) },
      );
      return LEGAL_PAGE_KINDS.flatMap((kind) => {
        const row = rows.find((r) => r.id === legalId(kind));
        return row
          ? [
              {
                kind,
                effectiveFrom: row.effectiveFrom,
                updatedAt: row.updatedAt,
              },
            ]
          : [];
      });
    } catch {
      return [];
    }
  },
  ['cms-legal-pages'],
  { revalidate: 300, tags: ['cms:legalPage'] },
);

export type CmsCvTemplateRow = {
  code: string;
  name: string;
  description: string | null;
  previewUrl: string | null;
};

const fetchCvTemplatesCached = unstable_cache(
  async (locale: string): Promise<CmsCvTemplateRow[]> => {
    const client = getCmsClient();
    if (!client) return [];
    const builder = getSanityImageBuilder();
    try {
      const raw = await client.fetch<
        Array<{
          code: string;
          name: string | null;
          description: string | null;
          previewImage: Record<string, unknown> | null;
        }>
      >(
        `*[_type == "cvTemplate"] | order(code asc){
          code,
          "name": coalesce(name[$locale], name.sr, name.en),
          "description": coalesce(description[$locale], description.sr, description.en),
          previewImage
        }`,
        { locale },
      );
      return (raw ?? []).map((row) => ({
        code: row.code,
        name: row.name?.trim() || row.code,
        description: row.description?.trim() || null,
        previewUrl:
          builder && row.previewImage
            ? builder
                // Sanity image field (loosely typed from GROQ)
                .image(row.previewImage as never)
                .width(440)
                .height(620)
                .fit('crop')
                .auto('format')
                .url()
            : null,
      }));
    } catch {
      return [];
    }
  },
  ['cms-cv-templates-v1'],
  { revalidate: 300, tags: ['cms:cvTemplate'] },
);

export type CmsHomePromoBanner = {
  text: string;
  href: string;
};

const fetchCampaignCalendarBannerCached = unstable_cache(
  async (locale: string): Promise<CmsHomePromoBanner | null> => {
    const client = getCmsClient();
    if (!client) return null;
    const now = new Date();
    try {
      const rows = await client.fetch<
        Array<{
          slots: Array<{
            promoCode?: string | null;
            categorySlug?: string | null;
            bannerSr?: string | null;
            bannerEn?: string | null;
            linkPath?: string | null;
            startsAt?: string | null;
            endsAt?: string | null;
          }> | null;
        }>
      >(`*[_type == "campaignCalendar"]{
        slots[]{ promoCode, categorySlug, bannerSr, bannerEn, linkPath, startsAt, endsAt }
      }`);
      const slots = (rows ?? []).flatMap((r) => r.slots ?? []);
      const active = slots.find((s) => {
        const start = s.startsAt ? new Date(s.startsAt) : null;
        const end = s.endsAt ? new Date(s.endsAt) : null;
        if (start && now < start) return false;
        if (end && now > end) return false;
        return true;
      });
      if (!active) return null;
      const text =
        locale === 'en'
          ? active.bannerEn?.trim() || active.bannerSr?.trim() || ''
          : active.bannerSr?.trim() || active.bannerEn?.trim() || '';
      if (!text) return null;
      let href =
        active.linkPath?.trim() ||
        (active.categorySlug?.trim()
          ? `/jobs?category=${encodeURIComponent(active.categorySlug.trim())}`
          : '/jobs');
      if (!href.startsWith('/')) {
        href = `/${href}`;
      }
      return { text, href };
    } catch {
      return null;
    }
  },
  ['cms-campaign-calendar-banner-v1'],
  { revalidate: 120, tags: ['cms:campaignCalendar'] },
);

export async function fetchCmsHomePromoBanner(
  locale: string,
): Promise<CmsHomePromoBanner | null> {
  return fetchCampaignCalendarBannerCached(locale);
}

export async function fetchCvTemplates(
  locale: string,
): Promise<CmsCvTemplateRow[]> {
  return fetchCvTemplatesCached(locale);
}

/**
 * Home tile images at 2× Design A's sizes: category tiles ~218×120, the open
 * city tab ~552×440 (closed strips and phone tabs are crops of it).
 */
const SPOTLIGHT_IMAGE = {
  category: { w: 436, h: 240 },
  city: { w: 1104, h: 880 },
} as const;

export type CmsHomeJobsDiscoveryFetched = {
  categorySpotlights: CmsDiscoverySpotlightRow[];
  citySpotlights: CmsDiscoverySpotlightRow[];
};

export async function fetchCmsHomeJobsDiscovery(
  locale: string,
): Promise<CmsHomeJobsDiscoveryFetched | null> {
  return unstable_cache(
    async (): Promise<CmsHomeJobsDiscoveryFetched | null> => {
      const client = getCmsClient();
      if (!client) return null;
      const builder = getSanityImageBuilder();
      try {
        const raw = await client.fetch<{
          categorySpotlights?: Array<{
            slug: string;
            image: Record<string, unknown> | null;
            labelOverride?: string | null;
            exploreLabel?: string | null;
          }> | null;
          citySpotlights?: Array<{
            slug: string;
            image: Record<string, unknown> | null;
            labelOverride?: string | null;
            exploreLabel?: string | null;
          }> | null;
        } | null>(
          `*[_type == "homeJobsDiscovery" && _id in ["homeJobsDiscovery", "drafts.homeJobsDiscovery"]][0]{
          "categorySpotlights": categorySpotlights[]{
            "slug": categorySlug,
            image,
            "labelOverride": coalesce(label[$locale], label.sr, label.en),
            "exploreLabel": coalesce(exploreLabel[$locale], exploreLabel.sr, exploreLabel.en)
          },
          "citySpotlights": citySpotlights[]{
            "slug": citySlug,
            image,
            "labelOverride": coalesce(label[$locale], label.sr, label.en),
            "exploreLabel": coalesce(exploreLabel[$locale], exploreLabel.sr, exploreLabel.en)
          }
        }`,
          { locale },
        );

        if (!raw) return null;
        if (!raw.categorySpotlights?.length && !raw.citySpotlights?.length) {
          return null;
        }

        function rowToSpotlight(
          entry: {
            slug: string;
            image: Record<string, unknown> | null;
            labelOverride?: string | null;
            exploreLabel?: string | null;
          },
          size: { w: number; h: number },
        ): CmsDiscoverySpotlightRow {
          const slug = entry.slug?.trim() || '';
          return {
            slug,
            labelOverride: entry.labelOverride?.trim() || null,
            exploreLabel: entry.exploreLabel?.trim() || null,
            imageUrl:
              builder && entry.image && slug
                ? builder
                    .image(entry.image as never)
                    .width(size.w)
                    .height(size.h)
                    .fit('crop')
                    .auto('format')
                    .url()
                : null,
          };
        }

        return {
          categorySpotlights: (raw.categorySpotlights ?? [])
            .map((r) => rowToSpotlight(r, SPOTLIGHT_IMAGE.category))
            .filter((r) => r.slug.length > 0),
          citySpotlights: (raw.citySpotlights ?? [])
            .map((r) => rowToSpotlight(r, SPOTLIGHT_IMAGE.city))
            .filter((r) => r.slug.length > 0),
        };
      } catch {
        return null;
      }
    },
    ['cms-home-jobs-discovery-v1', locale],
    { revalidate: 300, tags: ['cms:homeJobsDiscovery'] },
  )();
}

export type CmsLandingSpotlight = {
  intro: string | null;
  /** Landing hero (~1152×300 in Design A), served at 2×. */
  imageUrl: string | null;
};

/** Intro and hero image for a city or category landing page, if the home tiles have one. */
export async function fetchCmsLandingSpotlight(
  kind: 'city' | 'category',
  slug: string,
  locale: string,
): Promise<CmsLandingSpotlight | null> {
  return unstable_cache(
    async (): Promise<CmsLandingSpotlight | null> => {
      const client = getCmsClient();
      if (!client) return null;
      const builder = getSanityImageBuilder();
      const field = kind === 'city' ? 'citySpotlights' : 'categorySpotlights';
      const slugField = kind === 'city' ? 'citySlug' : 'categorySlug';
      try {
        const row = await client.fetch<{
          intro: string | null;
          image: Record<string, unknown> | null;
        } | null>(
          `*[_type == "homeJobsDiscovery" && _id in ["homeJobsDiscovery", "drafts.homeJobsDiscovery"]][0].${field}[${slugField} == $slug][0]{
            "intro": coalesce(intro[$locale], intro.sr, intro.en),
            image
          }`,
          { slug, locale },
        );
        if (!row) return null;
        return {
          intro: row.intro?.trim() || null,
          imageUrl:
            builder && row.image
              ? builder
                  .image(row.image as never)
                  .width(2304)
                  .height(600)
                  .fit('crop')
                  .auto('format')
                  .url()
              : null,
        };
      } catch {
        return null;
      }
    },
    ['cms-landing-spotlight-v1', kind, slug, locale],
    { revalidate: 300, tags: ['cms:homeJobsDiscovery'] },
  )();
}
