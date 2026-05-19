import {
  CORRELATION_ID_HEADER,
  createRequestId,
  REQUEST_ID_HEADER,
} from './correlation';

export type ApiClientOptions = {
  baseUrl: string;
  getHeaders?: () => Record<string, string | undefined>;
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly statusText: string,
    readonly body: string,
  ) {
    super(`API ${status} ${statusText}: ${body}`);
    this.name = 'ApiError';
  }
}

/**
 * Typed fetch helper for the public Nest API (`NEXT_PUBLIC_API_URL`).
 */
export function createApiClient(options: ApiClientOptions) {
  const base = options.baseUrl.replace(/\/$/, '');

  async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
    const url = path.startsWith('http')
      ? path
      : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
    const fromInit = normalizeHeaders(init?.headers);
    const requestId =
      fromInit[REQUEST_ID_HEADER] ??
      fromInit[CORRELATION_ID_HEADER] ??
      createRequestId();
    const res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...stripUndefined(options.getHeaders?.()),
        ...fromInit,
        [REQUEST_ID_HEADER]: requestId,
      },
    });
    const text = await res.text();
    if (!res.ok) {
      throw new ApiError(res.status, res.statusText, text);
    }
    if (!text) {
      return undefined as T;
    }
    return JSON.parse(text) as T;
  }

  return { getJson };
}

function stripUndefined(
  h: Record<string, string | undefined> | undefined,
): Record<string, string> {
  if (!h) return {};
  return Object.fromEntries(
    Object.entries(h).filter(([, v]) => v !== undefined),
  ) as Record<string, string>;
}

function normalizeHeaders(h: HeadersInit | undefined): Record<string, string> {
  if (!h) return {};
  if (h instanceof Headers) {
    const out: Record<string, string> = {};
    h.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
  if (Array.isArray(h)) {
    return Object.fromEntries(h);
  }
  return h as Record<string, string>;
}
