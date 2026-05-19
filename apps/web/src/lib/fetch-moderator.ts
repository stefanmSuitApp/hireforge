import type {
  EmployerJobDetailResponse,
  ModeratorJobComposerBootstrapResponse,
  ModeratorJobDetailResponse,
  ModeratorJobQueueResponse,
  ModeratorMeResponse,
  PendingSubscriptionQueueResponse,
} from 'contracts';

import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';

export async function fetchModeratorMe(
  accessToken: string,
): Promise<
  | { ok: true; data: ModeratorMeResponse }
  | { ok: false; status: number; body: string }
> {
  const origin = resolveNestServerOrigin();
  const url = nestApiUrl(origin ?? '', 'moderator/me');
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
    return { ok: true, data: JSON.parse(text) as ModeratorMeResponse };
  } catch {
    return { ok: false, status: 502, body: text };
  }
}

export async function fetchModeratorQueue(
  accessToken: string,
  searchParams: string,
): Promise<
  | { ok: true; data: ModeratorJobQueueResponse }
  | { ok: false; status: number; body: string }
> {
  const origin = resolveNestServerOrigin();
  const base = nestApiUrl(origin ?? '', 'moderator/jobs/queue');
  if (!base) {
    return { ok: false, status: 503, body: 'NEXT_PUBLIC_API_URL missing' };
  }
  const url = searchParams ? `${base}?${searchParams}` : base;
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
    return { ok: true, data: JSON.parse(text) as ModeratorJobQueueResponse };
  } catch {
    return { ok: false, status: 502, body: text };
  }
}

export async function fetchModeratorJobComposerBootstrap(
  accessToken: string,
  companyId: string,
): Promise<
  | { ok: true; data: ModeratorJobComposerBootstrapResponse }
  | { ok: false; status: number; body: string }
> {
  const origin = resolveNestServerOrigin();
  const url = nestApiUrl(
    origin ?? '',
    `moderator/companies/${companyId}/job-composer-bootstrap`,
  );
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
      data: JSON.parse(text) as ModeratorJobComposerBootstrapResponse,
    };
  } catch {
    return { ok: false, status: 502, body: text };
  }
}

export async function fetchModeratorJobAuthoring(
  accessToken: string,
  jobId: string,
): Promise<
  | { ok: true; data: EmployerJobDetailResponse }
  | { ok: false; status: number; body: string }
> {
  const origin = resolveNestServerOrigin();
  const url = nestApiUrl(origin ?? '', `moderator/jobs/${jobId}/authoring`);
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
    return { ok: true, data: JSON.parse(text) as EmployerJobDetailResponse };
  } catch {
    return { ok: false, status: 502, body: text };
  }
}

export async function fetchModeratorJob(
  accessToken: string,
  jobId: string,
): Promise<
  | { ok: true; data: ModeratorJobDetailResponse }
  | { ok: false; status: number; body: string }
> {
  const origin = resolveNestServerOrigin();
  const url = nestApiUrl(origin ?? '', `moderator/jobs/${jobId}`);
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
    return { ok: true, data: JSON.parse(text) as ModeratorJobDetailResponse };
  } catch {
    return { ok: false, status: 502, body: text };
  }
}

export async function fetchModeratorPendingSubscriptionPayments(
  accessToken: string,
): Promise<
  | { ok: true; data: PendingSubscriptionQueueResponse }
  | { ok: false; status: number; body: string }
> {
  const origin = resolveNestServerOrigin();
  const url = nestApiUrl(
    origin ?? '',
    'moderator/subscriptions/pending-payment',
  );
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
      data: JSON.parse(text) as PendingSubscriptionQueueResponse,
    };
  } catch {
    return { ok: false, status: 502, body: text };
  }
}
