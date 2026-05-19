import type { NextRequest, NextResponse } from 'next/server';

import {
  STAFF_ACCESS_COOKIE,
  STAFF_ACCESS_COOKIE_MAX_AGE,
  STAFF_REFRESH_COOKIE,
  STAFF_REFRESH_COOKIE_MAX_AGE,
} from '@/lib/moderator-session';
import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';
import { getLocaleFromPathname } from '@/middleware/locale-path';

/** Refreshes staff JWT for moderator routes and for the admin dashboard (same login, `/moderator/login`). */
export function isModeratorSessionPath(pathname: string): boolean {
  const locale = getLocaleFromPathname(pathname);
  if (!locale) {
    return false;
  }
  if (pathname.startsWith(`/${locale}/moderator`)) {
    if (pathname.includes('/moderator/login')) {
      return false;
    }
    return true;
  }
  if (pathname.startsWith(`/${locale}/admin`)) {
    return true;
  }
  return false;
}

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

export async function mergeStaffRefreshIntoResponse(
  request: NextRequest,
  response: NextResponse,
): Promise<void> {
  if (!isModeratorSessionPath(request.nextUrl.pathname)) {
    return;
  }

  const refresh = request.cookies.get(STAFF_REFRESH_COOKIE)?.value;
  if (!refresh) {
    return;
  }

  const access = request.cookies.get(STAFF_ACCESS_COOKIE)?.value;
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

  response.cookies.set(STAFF_ACCESS_COOKIE, tokens.accessToken, {
    ...cookieBase,
    maxAge: STAFF_ACCESS_COOKIE_MAX_AGE,
  });
  response.cookies.set(STAFF_REFRESH_COOKIE, tokens.refreshToken, {
    ...cookieBase,
    maxAge: STAFF_REFRESH_COOKIE_MAX_AGE,
  });
}
