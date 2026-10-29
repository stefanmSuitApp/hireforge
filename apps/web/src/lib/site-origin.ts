/**
 * Absolute origin for sitemap/robots/canonicals (no trailing slash).
 *
 * `SITE_ORIGIN` is read at runtime, so one image can serve production and
 * staging (`https://staging.sljakam.com`); `NEXT_PUBLIC_APP_URL` is baked into
 * the build and stays the fallback (production does not set `SITE_ORIGIN`).
 */
export function absoluteSiteOrigin(): string {
  const explicit =
    process.env['SITE_ORIGIN']?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/\/$/, '');
    return host.startsWith('http') ? host : `https://${host}`;
  }
  return 'http://localhost:3000';
}
