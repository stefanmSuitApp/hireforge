import { NextResponse } from 'next/server';

import { getEmployerAccessToken } from '@/lib/employer-access-cookie';
import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';

type RouteContext = { params: Promise<{ jobId: string }> };

export async function GET(_req: Request, ctx: RouteContext) {
  const access = await getEmployerAccessToken();
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { jobId } = await ctx.params;
  const origin = resolveNestServerOrigin();
  const url = nestApiUrl(origin ?? '', `employer/jobs/${jobId}`);
  if (!url) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_API_URL is not configured' },
      { status: 503 },
    );
  }
  const upstream = await fetch(url, {
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

export async function PATCH(req: Request, ctx: RouteContext) {
  const access = await getEmployerAccessToken();
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { jobId } = await ctx.params;
  const origin = resolveNestServerOrigin();
  const url = nestApiUrl(origin ?? '', `employer/jobs/${jobId}`);
  if (!url) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_API_URL is not configured' },
      { status: 503 },
    );
  }
  const body = await req.text();
  const upstream = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${access}`,
    },
    body,
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
