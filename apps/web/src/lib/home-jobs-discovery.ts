import { buildListQuery, JOBS_LIST_PAGE_SIZE } from '@/features/jobs/lib/jobs-list-query';

export type CmsDiscoverySpotlightRow = {
  slug: string;
  imageUrl: string | null;
  labelOverride: string | null;
};

export type HomeJobsSpotlightTile = {
  slug: string;
  label: string;
  imageUrl: string | null;
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
 * Build category spotlight tiles directly from CMS data.
 * Does not require taxonomy from the database.
 */
export function buildCmsCategorySpotlightTiles(
  rows: CmsDiscoverySpotlightRow[],
): HomeJobsSpotlightTile[] {
  return rows.map((row) => {
    const q = buildListQuery({ category: row.slug }, 1, JOBS_LIST_PAGE_SIZE);
    return {
      slug: row.slug,
      label: row.labelOverride?.trim() || slugToLabel(row.slug),
      imageUrl: row.imageUrl,
      jobsHref: `/jobs?${q.toString()}`,
    };
  });
}

/**
 * Build city spotlight tiles directly from CMS data.
 * Does not require taxonomy from the database.
 */
export function buildCmsCitySpotlightTiles(
  rows: CmsDiscoverySpotlightRow[],
): HomeJobsSpotlightTile[] {
  return rows.map((row) => {
    const q = buildListQuery({ city: row.slug }, 1, JOBS_LIST_PAGE_SIZE);
    return {
      slug: row.slug,
      label: row.labelOverride?.trim() || slugToLabel(row.slug),
      imageUrl: row.imageUrl,
      jobsHref: `/jobs?${q.toString()}`,
    };
  });
}
