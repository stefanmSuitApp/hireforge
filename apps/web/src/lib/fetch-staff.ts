import type {
  AdminAuditListResponse,
  AdminCompanyAssignmentHistoryResponse,
  AdminJobCategoryListResponse,
  AdminPromoCodesListResponse,
  AdminUserListResponse,
  PendingSubscriptionQueueResponse,
  StaffCompanyDetailResponse,
  StaffCompanyListResponse,
  StaffEmployerListResponse,
} from 'contracts';

import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';

async function staffGet<T>(
  accessToken: string,
  path: string,
): Promise<
  { ok: true; data: T } | { ok: false; status: number; body: string }
> {
  const origin = resolveNestServerOrigin();
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
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return { ok: false, status: 502, body: text };
  }
}

export async function fetchStaffCompanyList(
  accessToken: string,
  searchParams?: string,
): Promise<
  | { ok: true; data: StaffCompanyListResponse }
  | { ok: false; status: number; body: string }
> {
  const base = 'moderator/companies';
  const path = searchParams ? `${base}?${searchParams}` : base;
  return staffGet<StaffCompanyListResponse>(accessToken, path);
}

export async function fetchStaffCompanyDetail(
  accessToken: string,
  companyId: string,
): Promise<
  | { ok: true; data: StaffCompanyDetailResponse }
  | { ok: false; status: number; body: string }
> {
  return staffGet<StaffCompanyDetailResponse>(
    accessToken,
    `moderator/companies/${companyId}`,
  );
}

export async function fetchStaffEmployerList(
  accessToken: string,
  searchParams?: string,
): Promise<
  | { ok: true; data: StaffEmployerListResponse }
  | { ok: false; status: number; body: string }
> {
  const base = 'moderator/employers';
  const path = searchParams ? `${base}?${searchParams}` : base;
  return staffGet<StaffEmployerListResponse>(accessToken, path);
}

export async function fetchAdminUserList(
  accessToken: string,
  searchParams?: string,
): Promise<
  | { ok: true; data: AdminUserListResponse }
  | { ok: false; status: number; body: string }
> {
  const base = 'admin/users';
  const path = searchParams ? `${base}?${searchParams}` : base;
  return staffGet<AdminUserListResponse>(accessToken, path);
}

export async function fetchAdminJobCategories(
  accessToken: string,
): Promise<
  | { ok: true; data: AdminJobCategoryListResponse }
  | { ok: false; status: number; body: string }
> {
  return staffGet<AdminJobCategoryListResponse>(
    accessToken,
    'admin/job-categories',
  );
}

export async function fetchAdminCompanyAssignmentHistory(
  accessToken: string,
  companyId: string,
): Promise<
  | { ok: true; data: AdminCompanyAssignmentHistoryResponse }
  | { ok: false; status: number; body: string }
> {
  return staffGet<AdminCompanyAssignmentHistoryResponse>(
    accessToken,
    `admin/companies/${companyId}/assignment-history`,
  );
}

export async function fetchAdminPromoCodesList(
  accessToken: string,
  searchParams?: string,
): Promise<
  | { ok: true; data: AdminPromoCodesListResponse }
  | { ok: false; status: number; body: string }
> {
  const base = 'admin/promo-codes';
  const path = searchParams ? `${base}?${searchParams}` : base;
  return staffGet<AdminPromoCodesListResponse>(accessToken, path);
}

export async function fetchAdminAudit(
  accessToken: string,
  searchParams?: string,
): Promise<
  | { ok: true; data: AdminAuditListResponse }
  | { ok: false; status: number; body: string }
> {
  const base = 'admin/audit';
  const path = searchParams ? `${base}?${searchParams}` : base;
  return staffGet<AdminAuditListResponse>(accessToken, path);
}

export async function fetchAdminPendingEnterpriseSubscriptions(
  accessToken: string,
): Promise<
  | { ok: true; data: PendingSubscriptionQueueResponse }
  | { ok: false; status: number; body: string }
> {
  return staffGet<PendingSubscriptionQueueResponse>(
    accessToken,
    'admin/subscriptions/pending-enterprise',
  );
}
