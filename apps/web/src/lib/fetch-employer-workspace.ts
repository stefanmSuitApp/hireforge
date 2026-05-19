import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';
import {
  employerWorkspaceResponseSchema,
  type EmployerWorkspaceResponse,
} from 'contracts';

export type EmployerWorkspacePayload = EmployerWorkspaceResponse;

export async function fetchEmployerWorkspace(
  accessToken: string,
): Promise<
  | { ok: true; data: EmployerWorkspacePayload }
  | { ok: false; status: number; body: string }
> {
  const origin = resolveNestServerOrigin();
  const url = nestApiUrl(origin ?? '', 'employer/workspace');
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
    const parsed = employerWorkspaceResponseSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, status: 502, body: text };
    }
    return { ok: true, data: parsed.data };
  } catch {
    return { ok: false, status: 502, body: text };
  }
}
