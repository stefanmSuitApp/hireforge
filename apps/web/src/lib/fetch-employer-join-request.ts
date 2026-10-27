import {
  employerJoinRequestResponseSchema,
  type EmployerJoinRequestResponse,
} from 'contracts';

import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';

/** `GET employer/join-request` — latest company join request for the signed-in employer. */
export async function fetchEmployerJoinRequest(
  accessToken: string,
): Promise<EmployerJoinRequestResponse | null> {
  const url = nestApiUrl(
    resolveNestServerOrigin() ?? '',
    'employer/join-request',
  );
  if (!url) {
    return null;
  }
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    return null;
  }
  const parsed = employerJoinRequestResponseSchema.safeParse(await res.json());
  return parsed.success ? parsed.data : null;
}
