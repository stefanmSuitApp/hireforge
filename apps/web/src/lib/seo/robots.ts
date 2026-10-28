import type { MetadataRoute } from 'next';

/** Private areas, per locale (`/*` = any locale). `$` also blocks the bare root. */
const WORKSPACES = ['candidate', 'employer', 'moderator', 'admin'];

export const ROBOTS_DISALLOW = [
  '/api/',
  ...WORKSPACES.flatMap((w) => [`/*/${w}/`, `/*/${w}$`]),
  '/*/jobs/*/apply',
  '/*/integration',
];

/**
 * Crawl rules for the production origin; any other host (the VM's IP, a
 * staging or preview domain) disallows everything so it never competes with
 * the real site.
 */
export function buildRobots(
  origin: string,
  requestHost: string | null,
): MetadataRoute.Robots {
  const productionHost = new URL(origin).host;
  if (requestHost && requestHost !== productionHost) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return {
    rules: { userAgent: '*', allow: '/', disallow: ROBOTS_DISALLOW },
    sitemap: `${origin}/sitemap.xml`,
  };
}
