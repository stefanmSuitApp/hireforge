import { NextResponse } from 'next/server';

import { isUuidString } from '@/lib/job-public-segment';
import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';

/** A company's uploaded logo (WebP). Links carry ?v=, so it caches for good. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ companyId: string }> },
) {
  const { companyId } = await ctx.params;
  if (!isUuidString(companyId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const url = nestApiUrl(
    resolveNestServerOrigin() ?? '',
    `public/company-logos/${companyId}`,
  );
  if (!url) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_API_URL is not configured' },
      { status: 503 },
    );
  }
  const upstream = await fetch(url, { headers: { accept: 'image/*' } });
  if (!upstream.ok) {
    return new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: {
        'Content-Type':
          upstream.headers.get('Content-Type') ?? 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }
  return new NextResponse(await upstream.arrayBuffer(), {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'image/webp',
      'Cache-Control':
        upstream.headers.get('Cache-Control') ??
        'public, max-age=31536000, immutable',
    },
  });
}
