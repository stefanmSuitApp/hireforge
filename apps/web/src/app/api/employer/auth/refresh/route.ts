import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';
import {
  EMPLOYER_ACCESS_COOKIE,
  EMPLOYER_ACCESS_COOKIE_MAX_AGE,
  EMPLOYER_REFRESH_COOKIE,
  EMPLOYER_REFRESH_COOKIE_MAX_AGE,
} from '@/lib/employer-session';

/** Rotates employer session cookies using the HttpOnly refresh token (optional client-triggered refresh). */
export async function POST() {
  const cookieStore = await cookies();
  const refresh = cookieStore.get(EMPLOYER_REFRESH_COOKIE)?.value;
  if (!refresh) {
    return NextResponse.json({ error: 'No refresh session' }, { status: 401 });
  }

  const origin = resolveNestServerOrigin();
  const url = nestApiUrl(origin ?? '', 'auth/refresh');
  if (!url) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_API_URL is not configured' },
      { status: 503 },
    );
  }

  const upstream = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refreshToken: refresh }),
  });
  const text = await upstream.text();
  if (!upstream.ok) {
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        'Content-Type':
          upstream.headers.get('Content-Type') ?? 'application/json',
      },
    });
  }

  let tokens: { accessToken?: string; refreshToken?: string };
  try {
    tokens = JSON.parse(text) as {
      accessToken?: string;
      refreshToken?: string;
    };
  } catch {
    return NextResponse.json(
      { error: 'Invalid upstream response' },
      { status: 502 },
    );
  }
  if (!tokens.accessToken || !tokens.refreshToken) {
    return NextResponse.json(
      { error: 'Invalid upstream response' },
      { status: 502 },
    );
  }

  const secure = process.env.NODE_ENV === 'production';
  const cookieBase = {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure,
    path: '/',
  };

  cookieStore.set(EMPLOYER_ACCESS_COOKIE, tokens.accessToken, {
    ...cookieBase,
    maxAge: EMPLOYER_ACCESS_COOKIE_MAX_AGE,
  });
  cookieStore.set(EMPLOYER_REFRESH_COOKIE, tokens.refreshToken, {
    ...cookieBase,
    maxAge: EMPLOYER_REFRESH_COOKIE_MAX_AGE,
  });

  return NextResponse.json({ ok: true as const });
}
