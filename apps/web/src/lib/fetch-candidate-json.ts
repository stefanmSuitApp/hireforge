import { nestApiUrl, resolveNestPublicOrigin } from '@/lib/nest-api-url';

/** Server-side GET of a candidate API path with the session's access token. */
export async function fetchCandidateJson<T>(
  accessToken: string,
  path: string,
): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  const url = nestApiUrl(resolveNestPublicOrigin() ?? '', path);
  if (!url) return { ok: false, status: 503 };
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });
  if (!res.ok) return { ok: false, status: res.status };
  try {
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: 502 };
  }
}
