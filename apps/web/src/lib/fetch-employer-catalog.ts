import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';

import type {
  EmployerPackageCatalogResponse,
  EmployerProformaDetail,
} from 'contracts';

export async function fetchEmployerPackageCatalog(
  accessToken: string,
): Promise<
  | { ok: true; data: EmployerPackageCatalogResponse }
  | { ok: false; status: number; body: string }
> {
  const origin = resolveNestServerOrigin();
  const url = nestApiUrl(origin ?? '', 'employer/packages');
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
      data: JSON.parse(text) as EmployerPackageCatalogResponse,
    };
  } catch {
    return { ok: false, status: 502, body: text };
  }
}

export async function fetchEmployerProforma(
  accessToken: string,
  proformaId: string,
): Promise<
  | { ok: true; data: EmployerProformaDetail }
  | { ok: false; status: number; body: string }
> {
  const origin = resolveNestServerOrigin();
  const path = `employer/billing/proformas/${proformaId}`;
  const url = nestApiUrl(origin ?? '', path);
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
    return { ok: true, data: JSON.parse(text) as EmployerProformaDetail };
  } catch {
    return { ok: false, status: 502, body: text };
  }
}
