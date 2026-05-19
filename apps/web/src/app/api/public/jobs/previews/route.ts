import { NextResponse } from 'next/server';

import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';

export async function GET(req: Request) {
  const origin = resolveNestServerOrigin();
  const base = nestApiUrl(origin ?? '', 'public/jobs/previews');
  if (!base) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_API_URL is not configured' },
      { status: 503 },
    );
  }
  const { searchParams } = new URL(req.url);
  const refs = searchParams.get('refs') ?? '';
  const url = `${base}?refs=${encodeURIComponent(refs)}`;
  const upstream = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 30 },
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
