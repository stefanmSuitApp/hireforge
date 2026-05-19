import type { NextRequest, NextResponse } from 'next/server';

import {
  EMPLOYER_ACCESS_COOKIE,
  EMPLOYER_ACCESS_COOKIE_MAX_AGE,
  EMPLOYER_REFRESH_COOKIE,
  EMPLOYER_REFRESH_COOKIE_MAX_AGE,
} from '@/lib/employer-session';
import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';
import { getLocaleFromPathname } from '@/middleware/locale-path';

/** Paths like `/sr/employer` or `/en/employer/foo` but not login/register. */
export function isEmployerSessionPath(pathname: string): boolean {
  const locale = getLocaleFromPathname(pathname);
  if (!locale || !pathname.startsWith(`/${locale}/employer`)) {
    return false;
  }
  if (
    pathname.includes('/employer/login') ||
    pathname.includes('/employer/register')
  ) {
    return false;
  }
  return true;
}

/** Decode JWT `exp` (seconds since epoch) without verifying signature — only for refresh timing. */
function decodeJwtExpSeconds(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) {
      base64 += '='.repeat(4 - pad);
    }
    const json = JSON.parse(atob(base64)) as { exp?: unknown };
    return typeof json.exp === 'number' ? json.exp : null;
  } catch {
    return null;
  }
}

const ACCESS_SKEW_SEC = 90;

/**
 * If the access token is missing/expiring soon and a refresh token exists,
 * calls Nest `POST /api/auth/refresh` and sets new cookies on `response`.
 */
export async function mergeEmployerRefreshIntoResponse(
  request: NextRequest,
  response: NextResponse,
): Promise<void> {
  if (!isEmployerSessionPath(request.nextUrl.pathname)) {
    return;
  }

  const refresh = request.cookies.get(EMPLOYER_REFRESH_COOKIE)?.value;
  if (!refresh) {
    return;
  }

  const access = request.cookies.get(EMPLOYER_ACCESS_COOKIE)?.value;
  const now = Math.floor(Date.now() / 1000);
  if (access) {
    const exp = decodeJwtExpSeconds(access);
    if (exp != null && exp > now + ACCESS_SKEW_SEC) {
      return;
    }
  }

  const origin = resolveNestServerOrigin();
  // The API uses one refresh endpoint for all roles; the refresh token identifies
  // the user, and Nest reissues an access token from the stored user role.
  const url = nestApiUrl(origin ?? '', 'auth/refresh');
  if (!url) {
    return;
  }

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ refreshToken: refresh }),
    });
  } catch {
    return;
  }

  const text = await upstream.text();
  if (!upstream.ok) {
    return;
  }

  let tokens: { accessToken?: string; refreshToken?: string };
  try {
    tokens = JSON.parse(text) as {
      accessToken?: string;
      refreshToken?: string;
    };
  } catch {
    return;
  }
  if (!tokens.accessToken || !tokens.refreshToken) {
    return;
  }

  const secure = process.env.NODE_ENV === 'production';
  const cookieBase = {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure,
    path: '/',
  };

  response.cookies.set(EMPLOYER_ACCESS_COOKIE, tokens.accessToken, {
    ...cookieBase,
    maxAge: EMPLOYER_ACCESS_COOKIE_MAX_AGE,
  });
  response.cookies.set(EMPLOYER_REFRESH_COOKIE, tokens.refreshToken, {
    ...cookieBase,
    maxAge: EMPLOYER_REFRESH_COOKIE_MAX_AGE,
  });
}
