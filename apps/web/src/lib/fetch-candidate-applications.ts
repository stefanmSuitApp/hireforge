import type { CandidateApplicationListItem } from 'contracts';

import { nestApiUrl, resolveNestPublicOrigin } from '@/lib/nest-api-url';

export async function fetchCandidateApplications(
  accessToken: string,
): Promise<
  | { ok: true; data: CandidateApplicationListItem[] }
  | { ok: false; status: number; body: string }
> {
  const origin = resolveNestPublicOrigin();
  const url = nestApiUrl(origin ?? '', 'candidate/applications');
  if (!url) {
    return { ok: false, status: 503, body: 'NEXT_PUBLIC_API_URL missing' };
  }
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });
  const text = await res.text();
  if (!res.ok) {
    return { ok: false, status: res.status, body: text };
  }
  try {
    return {
      ok: true,
      data: JSON.parse(text) as CandidateApplicationListItem[],
    };
  } catch {
    return { ok: false, status: 502, body: text };
  }
}
