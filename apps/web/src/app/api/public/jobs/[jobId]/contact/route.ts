import { NextResponse } from 'next/server';

import { forwardClientIpHeaders } from '@/lib/client-ip';
import { isUuidString } from '@/lib/job-public-segment';
import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';

/** Phone/Viber/e-mail apply: the link for one tap (counted, rate-limited). */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await ctx.params;
  // Params are URL-decoded: validate before building the upstream path.
  if (!isUuidString(jobId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const url = nestApiUrl(
    resolveNestServerOrigin() ?? '',
    `public/jobs/${jobId}/contact`,
  );
  if (!url) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_API_URL is not configured' },
      { status: 503 },
    );
  }
  const upstream = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Right-most hop only: left entries are client-supplied and spoofable.
      ...forwardClientIpHeaders(req.headers),
    },
    body: await req.text(),
    cache: 'no-store',
  });
  return new NextResponse(await upstream.text(), {
    status: upstream.status,
    headers: {
      'Content-Type':
        upstream.headers.get('Content-Type') ?? 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
