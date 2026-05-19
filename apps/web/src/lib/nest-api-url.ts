/**
 * Build a full URL to the Nest global prefix (`/api/...`), whether
 * `NEXT_PUBLIC_API_URL` is `http://host:4000` or `http://host:4000/api`.
 */
export function nestApiUrl(
  baseUrl: string | undefined,
  /** Path after `/api/`, e.g. `public/jobs` or `integration`. */
  apiPath: string,
): string | null {
  if (!baseUrl?.trim()) {
    return null;
  }
  const path = apiPath.replace(/^\//, '');
  const b = baseUrl.trim().replace(/\/$/, '');
  if (b.endsWith('/api')) {
    return `${b}/${path}`;
  }
  return `${b}/api/${path}`;
}

/**
 * Resolves the Nest API origin for `NEXT_PUBLIC_API_URL`.
 *
 * - **Development:** if unset, defaults to `http://localhost:4000` (Nest’s usual port).
 * - **Common mistake:** env points at the Next dev server (`:3000`) → we rewrite to `:4000`
 *   so jobs/integration calls hit Nest without editing `.env`.
 * - **Production:** set `NEXT_PUBLIC_API_URL` explicitly to your API origin (no default).
 */
function normalizeBrowserMistakenNextPort(origin: string): string {
  // Next dev is :3000; Nest is :4000 — same host, wrong port in .env
  if (/^https?:\/\/(localhost|127\.0\.0\.1):3000(\/|$)/.test(origin)) {
    return origin.replace(':3000', ':4000');
  }
  return origin;
}

export function resolveNestPublicOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (!raw) {
    return process.env.NODE_ENV === 'development'
      ? 'http://localhost:4000'
      : null;
  }

  return normalizeBrowserMistakenNextPort(raw);
}

/**
 * Nest origin for **server-side** fetches from Next (RSC, server actions).
 * Prefer this over {@link resolveNestPublicOrigin} when Next runs in Docker/Kubernetes:
 * the browser may use a public URL while the server must call a service name or host gateway.
 *
 * Resolution order: `NEST_API_URL` → `INTERNAL_API_URL` → `API_INTERNAL_URL` → same as public.
 */
export function resolveNestServerOrigin(): string | null {
  const internal =
    process.env.NEST_API_URL?.trim() ||
    process.env.INTERNAL_API_URL?.trim() ||
    process.env.API_INTERNAL_URL?.trim();
  if (internal) {
    return normalizeBrowserMistakenNextPort(internal);
  }
  return resolveNestPublicOrigin();
}
