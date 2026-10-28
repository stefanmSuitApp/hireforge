/**
 * `PUBLIC_JOBS` (default on): job list/detail and the employers pages are
 * public; apply and save stay behind login. `false`/`0`/`off` brings back the
 * sign-in wall and switches off what depends on public jobs (JSON-LD, job
 * sitemaps, indexing pings). Read at runtime, not at build time.
 */
export function publicJobsEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const raw = env['PUBLIC_JOBS']?.trim().toLowerCase();
  return !(raw === 'false' || raw === '0' || raw === 'off' || raw === 'no');
}
