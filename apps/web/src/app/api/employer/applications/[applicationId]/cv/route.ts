import { NextResponse } from 'next/server';

import { getEmployerAccessToken } from '@/lib/employer-access-cookie';
import { isUuidString } from '@/lib/job-public-segment';
import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';

type Ctx = { params: Promise<{ applicationId: string }> };

/** The CV sent with an application, as an attachment. */
export async function GET(_req: Request, ctx: Ctx) {
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
    `employer/applications/${applicationId}/cv`,
  );
  if (!url) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_API_URL is not configured' },
      { status: 503 },
    );
  }
  const upstream = await fetch(url, {
    headers: { Authorization: `Bearer ${access}` },
    cache: 'no-store',
  });
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
  const headers = new Headers();
  headers.set(
    'Content-Type',
    upstream.headers.get('Content-Type') ?? 'application/octet-stream',
  );
  const cd = upstream.headers.get('Content-Disposition');
  if (cd) headers.set('Content-Disposition', cd);
  // A CV is personal data: never cached by the browser or a proxy.
  headers.set('Cache-Control', 'private, no-store');
  return new NextResponse(await upstream.arrayBuffer(), {
    status: 200,
    headers,
  });
}
