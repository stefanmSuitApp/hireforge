/**
 * Real client IP for upstream Nest calls. Caddy sets `X-Forwarded-For` on the
 * request it proxies to Next; the right-most entry is the address Caddy saw
 * (left entries can be client-supplied). Nest uses it for auth rate limits.
 */
export function clientIpFromHeaders(headers: Headers): string | null {
  const raw = headers.get('x-forwarded-for');
  if (!raw) {
    return null;
  }
  const parts = raw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.at(-1)?.slice(0, 64) ?? null;
}

/** Spread into upstream fetch headers: `{ ...forwardClientIpHeaders(req.headers) }`. */
export function forwardClientIpHeaders(
  headers: Headers,
): Record<string, string> {
  const ip = clientIpFromHeaders(headers);
  return ip ? { 'X-Forwarded-For': ip } : {};
}
