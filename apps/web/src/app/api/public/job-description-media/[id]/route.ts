import { NextResponse } from 'next/server';

import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';

/** Path segment is a UUID (Nest `ParseUUIDPipe`). */
const UUID_RE = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const origin = resolveNestServerOrigin();
  const url = nestApiUrl(origin ?? '', `public/job-description-media/${id}`);
  if (!url) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_API_URL is not configured' },
      { status: 503 },
    );
  }

  const upstream = await fetch(url, { headers: { accept: 'image/*' } });
  if (!upstream.ok) {
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        'Content-Type':
          upstream.headers.get('Content-Type') ?? 'application/json',
      },
    });
  }

  const buf = await upstream.arrayBuffer();
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'image/avif',
      'Cache-Control':
        upstream.headers.get('Cache-Control') ??
        'public, max-age=31536000, immutable',
    },
  });
}
