import { NextResponse } from 'next/server';

import { getEmployerAccessToken } from '@/lib/employer-access-cookie';
import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';

type RouteContext = { params: Promise<{ jobId: string }> };

export async function POST(req: Request, ctx: RouteContext) {
  const access = await getEmployerAccessToken();
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { jobId } = await ctx.params;
  const origin = resolveNestServerOrigin();
  const url = nestApiUrl(origin ?? '', `employer/jobs/${jobId}/image`);
  if (!url) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_API_URL is not configured' },
      { status: 503 },
    );
  }

  const incoming = await req.formData();
  const file = incoming.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: 'Missing file field "file"' },
      { status: 400 },
    );
  }

  const outbound = new FormData();
  outbound.append('file', file, file.name || 'upload.jpg');

  const upstream = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access}`,
    },
    body: outbound,
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
