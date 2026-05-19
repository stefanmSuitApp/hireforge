import { NextResponse } from 'next/server';

import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';

/**
 * Proxies `GET /api/public/jobs?...` to Nest (same-origin for the browser).
 */
export async function GET(req: Request) {
  const origin = resolveNestServerOrigin();
  const upstreamBase = nestApiUrl(origin ?? '', 'public/jobs');
  if (!upstreamBase) {
    return NextResponse.json(
      { error: 'API origin is not configured' },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const qs = url.searchParams.toString();
  const upstream = `${upstreamBase}${qs ? `?${qs}` : ''}`;

  const res = await fetch(upstream, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: {
      'Content-Type':
        res.headers.get('Content-Type') ?? 'application/json',
    },
  });
}
