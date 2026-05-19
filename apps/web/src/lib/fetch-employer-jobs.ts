import type {
  EmployerJobApplicationItem,
  EmployerJobDetailResponse,
  EmployerJobListItem,
} from 'contracts';

import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';

export async function fetchEmployerJob(
  accessToken: string,
  jobId: string,
): Promise<
  | { ok: true; data: EmployerJobDetailResponse }
  | { ok: false; status: number; body: string }
> {
  const origin = resolveNestServerOrigin();
  const url = nestApiUrl(origin ?? '', `employer/jobs/${jobId}`);
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
      data: JSON.parse(text) as EmployerJobDetailResponse,
    };
  } catch {
    return { ok: false, status: 502, body: text };
  }
}

export async function fetchEmployerJobsList(
  accessToken: string,
): Promise<
  | { ok: true; data: EmployerJobListItem[] }
  | { ok: false; status: number; body: string }
> {
  const origin = resolveNestServerOrigin();
  const url = nestApiUrl(origin ?? '', 'employer/jobs');
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
      data: JSON.parse(text) as EmployerJobListItem[],
    };
  } catch {
    return { ok: false, status: 502, body: text };
  }
}

export async function fetchEmployerJobApplications(
  accessToken: string,
  jobId: string,
): Promise<
  | { ok: true; data: EmployerJobApplicationItem[] }
  | { ok: false; status: number; body: string }
> {
  const origin = resolveNestServerOrigin();
  const url = nestApiUrl(origin ?? '', `employer/jobs/${jobId}/applications`);
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
      data: JSON.parse(text) as EmployerJobApplicationItem[],
    };
  } catch {
    return { ok: false, status: 502, body: text };
  }
}
