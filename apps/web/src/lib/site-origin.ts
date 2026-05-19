/** Absolute origin for sitemap/robots (no trailing slash). */
export function absoluteSiteOrigin(): string {
  const explicit =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ?? process.env.APP_URL?.trim();
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
