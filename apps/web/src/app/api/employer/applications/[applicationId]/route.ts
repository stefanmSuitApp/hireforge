import { NextResponse } from 'next/server';

import { getEmployerAccessToken } from '@/lib/employer-access-cookie';
import { isUuidString } from '@/lib/job-public-segment';
import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';

type Ctx = { params: Promise<{ applicationId: string }> };

/** `PATCH /api/employer/applications/:id` `{ status }` → Nest. */
export async function PATCH(req: Request, ctx: Ctx) {
  const access = await getEmployerAccessToken();
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { applicationId } = await ctx.params;
  // Params are URL-decoded: validate before building the upstream path.
  if (!isUuidString(applicationId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const url = nestApiUrl(
    resolveNestServerOrigin() ?? '',
    `employer/applications/${applicationId}`,
  );
  if (!url) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_API_URL is not configured' },
      { status: 503 },
    );
  }
  const upstream = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${access}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: await req.text(),
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
