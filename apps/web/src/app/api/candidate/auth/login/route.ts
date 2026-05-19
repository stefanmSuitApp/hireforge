import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';
import { clearNonCandidateSessionCookies } from '@/lib/auth-cookie-utils';
import {
  CANDIDATE_ACCESS_COOKIE,
  CANDIDATE_ACCESS_COOKIE_MAX_AGE,
  CANDIDATE_REFRESH_COOKIE,
  CANDIDATE_REFRESH_COOKIE_MAX_AGE,
} from '@/lib/candidate-session';

export async function POST(req: Request) {
  const origin = resolveNestServerOrigin();
  const url = nestApiUrl(origin ?? '', 'auth/candidate/login');
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
  clearNonCandidateSessionCookies(cookieStore);
  const secure = process.env.NODE_ENV === 'production';
  cookieStore.set(CANDIDATE_ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: CANDIDATE_ACCESS_COOKIE_MAX_AGE,
  });
  cookieStore.set(CANDIDATE_REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: CANDIDATE_REFRESH_COOKIE_MAX_AGE,
  });

  return NextResponse.json({ ok: true as const });
}
