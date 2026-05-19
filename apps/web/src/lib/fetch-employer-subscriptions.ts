import type { EmployerSubscriptionsListResponse } from 'contracts';
import { employerSubscriptionsListResponseSchema } from 'contracts';

import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';

export async function fetchEmployerSubscriptions(
  accessToken: string,
): Promise<
  | { ok: true; data: EmployerSubscriptionsListResponse }
  | { ok: false; status: number; body: string }
> {
  const origin = resolveNestServerOrigin();
  const url = nestApiUrl(origin ?? '', 'employer/subscriptions');
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
    const raw: unknown = JSON.parse(text);
    const parsed = employerSubscriptionsListResponseSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, status: 502, body: text };
    }
    return { ok: true, data: parsed.data };
  } catch {
    return { ok: false, status: 502, body: text };
  }
}
