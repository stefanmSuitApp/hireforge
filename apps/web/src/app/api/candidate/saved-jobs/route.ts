import { NextResponse } from 'next/server';

import { getCandidateAccessToken } from '@/lib/candidate-access-cookie';
import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';

export async function GET() {
  const access = await getCandidateAccessToken();
  if (!access) {
    // Every job card asks; a guest simply has none saved (a 401 per card
    // filled the console on public pages). Saving still answers 401.
    return NextResponse.json({ items: [] });
  }
  const origin = resolveNestServerOrigin();
  const url = nestApiUrl(origin ?? '', 'candidate/saved-jobs');
  if (!url) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_API_URL is not configured' },
      { status: 503 },
    );
  }
  const upstream = await fetch(url, {
    headers: {
      Authorization: `Bearer ${access}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      'Content-Type':
        upstream.headers.get('Content-Type') ?? 'application/json',
    },
  });
}

export async function POST(req: Request) {
  const access = await getCandidateAccessToken();
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const origin = resolveNestServerOrigin();
  const url = nestApiUrl(origin ?? '', 'candidate/saved-jobs');
  if (!url) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_API_URL is not configured' },
      { status: 503 },
    );
  }
  const body = await req.text();
  const upstream = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${access}`,
    },
    body,
    cache: 'no-store',
  });
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      'Content-Type':
        upstream.headers.get('Content-Type') ?? 'application/json',
    },
  });
}
