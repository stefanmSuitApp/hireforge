import type { PublicCompanyLogosResponse } from 'contracts';

import { nestApiUrl, resolveNestPublicOrigin } from './nest-api-url';

/** Cache tag the staff logo routes expire after an upload or removal. */
export const COMPANY_LOGOS_TAG = 'public:company-logos';

/**
 * Slug → URL of logos staff uploaded (they win over Sanity's). Empty when the
 * API is unreachable, so the site falls back to Sanity logos and initials.
 */
export async function fetchCompanyLogos(): Promise<PublicCompanyLogosResponse> {
  const url = nestApiUrl(
    resolveNestPublicOrigin() ?? '',
    'public/company-logos',
  );
  if (!url) return {};
  try {
    const res = await fetch(url, {
      next: { revalidate: 300, tags: [COMPANY_LOGOS_TAG] },
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return {};
    const body: unknown = await res.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) return {};
    return Object.fromEntries(
      Object.entries(body).filter(
        (e): e is [string, string] =>
          typeof e[1] === 'string' &&
          e[1].startsWith('/api/public/company-logos/'),
      ),
    );
  } catch {
    return {};
  }
}
