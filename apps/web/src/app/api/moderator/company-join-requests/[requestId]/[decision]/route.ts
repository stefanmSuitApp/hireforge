import { NextResponse } from 'next/server';

import { isUuidString } from '@/lib/job-public-segment';
import { getStaffAccessToken } from '@/lib/moderator-access-cookie';
import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';

type Ctx = { params: Promise<{ requestId: string; decision: string }> };

/** `POST /api/moderator/company-join-requests/:id/(approve|reject)` → Nest. */
export async function POST(_req: Request, ctx: Ctx) {
  const access = await getStaffAccessToken();
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { requestId, decision } = await ctx.params;
  // Params are URL-decoded: validate before building the upstream path.
  if (
    !isUuidString(requestId) ||
    (decision !== 'approve' && decision !== 'reject')
  ) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const url = nestApiUrl(
    resolveNestServerOrigin() ?? '',
    `moderator/company-join-requests/${requestId}/${decision}`,
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
