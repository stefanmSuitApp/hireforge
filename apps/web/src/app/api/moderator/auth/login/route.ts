import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { clearNonStaffSessionCookies } from '@/lib/auth-cookie-utils';
import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';
import {
  STAFF_ACCESS_COOKIE,
  STAFF_ACCESS_COOKIE_MAX_AGE,
  STAFF_REFRESH_COOKIE,
  STAFF_REFRESH_COOKIE_MAX_AGE,
} from '@/lib/moderator-session';

export async function POST(req: Request) {
  const origin = resolveNestServerOrigin();
  const url = nestApiUrl(origin ?? '', 'auth/staff/login');
  if (!url) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_API_URL is not configured' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const upstream = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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

  const cookieStore = await cookies();
  clearNonStaffSessionCookies(cookieStore);
  const secure = process.env.NODE_ENV === 'production';
  cookieStore.set(STAFF_ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: STAFF_ACCESS_COOKIE_MAX_AGE,
  });
  cookieStore.set(STAFF_REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: STAFF_REFRESH_COOKIE_MAX_AGE,
  });

  return NextResponse.json({ ok: true as const });
}
