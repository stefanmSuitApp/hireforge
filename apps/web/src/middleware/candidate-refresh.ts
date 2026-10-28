import type { NextRequest, NextResponse } from 'next/server';

import {
  CANDIDATE_ACCESS_COOKIE,
  CANDIDATE_ACCESS_COOKIE_MAX_AGE,
  CANDIDATE_REFRESH_COOKIE,
  CANDIDATE_REFRESH_COOKIE_MAX_AGE,
} from '@/lib/candidate-session';
import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';
import { isSessionRefreshPath } from '@/middleware/auth-gate';
import { forwardClientIpHeaders } from '@/lib/client-ip';

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

export async function mergeCandidateRefreshIntoResponse(
  request: NextRequest,
  response: NextResponse,
): Promise<void> {
  if (!isSessionRefreshPath(request.nextUrl.pathname)) {
    return;
  }

  const refresh = request.cookies.get(CANDIDATE_REFRESH_COOKIE)?.value;
  if (!refresh) {
    return;
  }

  const access = request.cookies.get(CANDIDATE_ACCESS_COOKIE)?.value;
  const now = Math.floor(Date.now() / 1000);
  if (access) {
    const exp = decodeJwtExpSeconds(access);
    if (exp != null && exp > now + ACCESS_SKEW_SEC) {
      return;
    }
  }

  const origin = resolveNestServerOrigin();
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
        ...forwardClientIpHeaders(request.headers),
      },
      body: JSON.stringify({ refreshToken: refresh }),
    });
  } catch {
    return;
  }

  const text = await upstream.text();
  if (upstream.status === 401) {
    // Revoked or expired: drop the cookies so pages stop retrying the refresh.
    response.cookies.delete(CANDIDATE_ACCESS_COOKIE);
    response.cookies.delete(CANDIDATE_REFRESH_COOKIE);
    return;
  }
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

  response.cookies.set(CANDIDATE_ACCESS_COOKIE, tokens.accessToken, {
    ...cookieBase,
    maxAge: CANDIDATE_ACCESS_COOKIE_MAX_AGE,
  });
  response.cookies.set(CANDIDATE_REFRESH_COOKIE, tokens.refreshToken, {
    ...cookieBase,
    maxAge: CANDIDATE_REFRESH_COOKIE_MAX_AGE,
  });
}
