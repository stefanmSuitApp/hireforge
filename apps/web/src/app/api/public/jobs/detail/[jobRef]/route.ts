import { NextResponse } from 'next/server';

import { isUuidString } from '@/lib/job-public-segment';
import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';

/**
 * Browser-safe proxy for public job detail (avoids CORS on direct Nest calls).
 * Forwards to `GET /api/public/jobs/:id` or `GET /api/public/jobs/by-slug/:slug` on Nest.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ jobRef: string }> },
) {
  const { jobRef: raw } = await ctx.params;
  let jobRef = raw.trim();
  try {
    jobRef = decodeURIComponent(jobRef).trim();
  } catch {
    /* already decoded or invalid escape; use raw */
  }
  if (!jobRef) {
    return NextResponse.json({ error: 'missing_job_ref' }, { status: 400 });
  }

  const origin = resolveNestServerOrigin();
  const path = isUuidString(jobRef)
    ? `public/jobs/${jobRef}`
    : `public/jobs/by-slug/${encodeURIComponent(jobRef)}`;
  const url = nestApiUrl(origin ?? '', path);
  if (!url) {
    return NextResponse.json(
      { error: 'API origin is not configured' },
      { status: 503 },
    );
  }

  const upstream = await fetch(url, {
    headers: { Accept: 'application/json' },
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
