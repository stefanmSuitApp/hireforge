import { NextResponse } from 'next/server';

import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';
import { viewerAuthHeaders } from '@/lib/viewer-access-token';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await ctx.params;
  const origin = resolveNestServerOrigin();
  const url = nestApiUrl(origin ?? '', `public/jobs/${jobId}/similar`);
  if (!url) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_API_URL is not configured' },
      { status: 503 },
    );
  }
  const auth = await viewerAuthHeaders();
  // Guests share a cached teaser view; signed-in reads are per user.
  const upstream = await fetch(url, {
    headers: { Accept: 'application/json', ...auth },
    ...(auth.authorization
      ? { cache: 'no-store' as const }
      : { next: { revalidate: 60 } }),
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
