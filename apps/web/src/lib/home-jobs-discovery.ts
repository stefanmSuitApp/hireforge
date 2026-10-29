import { landingPath } from '@/lib/seo/sitemap';

export type CmsDiscoverySpotlightRow = {
  slug: string;
  imageUrl: string | null;
  labelOverride: string | null;
  /** Whole button text, already declined ("Istraži Suboticu"). */
  exploreLabel?: string | null;
};

export type HomeJobsSpotlightTile = {
  slug: string;
  label: string;
  imageUrl: string | null;
  /** Whole button text from Sanity, already declined ("Istraži Suboticu"). */
  exploreLabel?: string | null;
  /** Relative path including query for `next-intl` `Link`. */
  jobsHref: string;
};

function slugToLabel(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Editors can pick slugs the database doesn't have, and their landing pages
 * are 404s. Drop those; an empty list (taxonomy unavailable) keeps all rows.
 */
function onlyKnown(
  rows: CmsDiscoverySpotlightRow[],
  known: ReadonlyArray<{ slug: string }>,
): CmsDiscoverySpotlightRow[] {
  if (known.length === 0) return rows;
  const slugs = new Set(known.map((k) => k.slug));
  return rows.filter((row) => slugs.has(row.slug));
}

/** Category spotlight tiles from CMS data, limited to known categories. */
export function buildCmsCategorySpotlightTiles(
  rows: CmsDiscoverySpotlightRow[],
  knownCategories: ReadonlyArray<{ slug: string }>,
): HomeJobsSpotlightTile[] {
  return onlyKnown(rows, knownCategories).map((row) => {
    return {
      slug: row.slug,
      label: row.labelOverride?.trim() || slugToLabel(row.slug),
      imageUrl: row.imageUrl,
      exploreLabel: row.exploreLabel ?? null,
      jobsHref: landingPath(null, row.slug) ?? '/jobs',
    };
  });
}

/** City spotlight tiles from CMS data, limited to known cities. */
export function buildCmsCitySpotlightTiles(
  rows: CmsDiscoverySpotlightRow[],
  knownCities: ReadonlyArray<{ slug: string }>,
): HomeJobsSpotlightTile[] {
  return onlyKnown(rows, knownCities).map((row) => {
    return {
      slug: row.slug,
      label: row.labelOverride?.trim() || slugToLabel(row.slug),
      imageUrl: row.imageUrl,
      exploreLabel: row.exploreLabel ?? null,
      jobsHref: landingPath(row.slug, null) ?? '/jobs',
    };
  });
}
