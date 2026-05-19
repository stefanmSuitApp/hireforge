import type {
  PublicCompanyDetailResponse,
  PublicEmployerDirectoryResponse,
  PublicJobDetailResponse,
  PublicJobListResponse,
  PublicJobTaxonomyResponse,
} from 'contracts';

import { isUuidString } from './job-public-segment';
import { nestApiUrl } from './nest-api-url';

export type PublicJobsResult =
  | { ok: true; data: PublicJobListResponse }
  | { ok: false; error: string; status?: number };

export type PublicJobTaxonomyResult =
  | { ok: true; data: PublicJobTaxonomyResponse }
  | { ok: false; error: string; status?: number };

export type PublicJobDetailResult =
  | { ok: true; data: PublicJobDetailResponse }
  | { ok: false; error: string; status?: number };

export type PublicCompanyDetailResult =
  | { ok: true; data: PublicCompanyDetailResponse }
  | { ok: false; error: string; status?: number };

export type PublicEmployersDirectoryResult =
  | { ok: true; data: PublicEmployerDirectoryResponse }
  | { ok: false; error: string; status?: number };

export async function fetchPublicJobTaxonomy(
  apiBaseUrl: string,
): Promise<PublicJobTaxonomyResult> {
  const url = nestApiUrl(apiBaseUrl, 'public/jobs/filters');
  if (!url) {
    return { ok: false, error: 'missing_api_url' };
  }
  try {
    const res = await fetch(url, {
      next: { revalidate: 300 },
      headers: { accept: 'application/json' },
    });
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: `HTTP ${res.status}`,
      };
    }
    const data = (await res.json()) as PublicJobTaxonomyResponse;
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'fetch_failed',
    };
  }
}

export async function fetchPublicJobsList(
  apiBaseUrl: string,
  searchParams: URLSearchParams,
): Promise<PublicJobsResult> {
  const url = nestApiUrl(apiBaseUrl, 'public/jobs');
  if (!url) {
    return { ok: false, error: 'missing_api_url' };
  }
  const full = `${url}?${searchParams.toString()}`;
  try {
    const res = await fetch(full, {
      /** Avoid stale job boards after publish; BFF/public API is the source of truth. */
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: `HTTP ${res.status}`,
      };
    }
    const data = (await res.json()) as PublicJobListResponse;
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'fetch_failed',
    };
  }
}

export async function fetchPublicJobDetail(
  apiBaseUrl: string,
  jobRef: string,
): Promise<PublicJobDetailResult> {
  const path = isUuidString(jobRef)
    ? `public/jobs/${jobRef}`
    : `public/jobs/by-slug/${encodeURIComponent(jobRef)}`;
  const url = nestApiUrl(apiBaseUrl, path);
  if (!url) {
    return { ok: false, error: 'missing_api_url' };
  }
  try {
    const res = await fetch(url, {
      next: { revalidate: 15 },
      headers: { accept: 'application/json' },
    });
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: `HTTP ${res.status}`,
      };
    }
    const data = (await res.json()) as PublicJobDetailResponse;
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'fetch_failed',
    };
  }
}

export async function fetchPublicEmployersDirectory(
  apiBaseUrl: string,
  accessToken?: string,
): Promise<PublicEmployersDirectoryResult> {
  const url = nestApiUrl(apiBaseUrl, 'public/employers');
  if (!url) {
    return { ok: false, error: 'missing_api_url' };
  }
  try {
    const res = await fetch(url, {
      next: { revalidate: 60 },
      headers: {
        accept: 'application/json',
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
    });
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: `HTTP ${res.status}`,
      };
    }
    const data = (await res.json()) as PublicEmployerDirectoryResponse;
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'fetch_failed',
    };
  }
}

export async function fetchPublicCompanyDetail(
  apiBaseUrl: string,
  slug: string,
): Promise<PublicCompanyDetailResult> {
  const url = nestApiUrl(apiBaseUrl, `public/jobs/company/${slug}`);
  if (!url) {
    return { ok: false, error: 'missing_api_url' };
  }
  try {
    const res = await fetch(url, {
      next: { revalidate: 30 },
      headers: { accept: 'application/json' },
    });
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: `HTTP ${res.status}`,
      };
    }
    const data = (await res.json()) as PublicCompanyDetailResponse;
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'fetch_failed',
    };
  }
}
