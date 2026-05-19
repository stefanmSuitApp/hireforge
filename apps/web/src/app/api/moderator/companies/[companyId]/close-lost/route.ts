import { NextResponse } from 'next/server';

import { getStaffAccessToken } from '@/lib/moderator-access-cookie';
import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';

type Ctx = { params: Promise<{ companyId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const access = await getStaffAccessToken();
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { companyId } = await ctx.params;
  const origin = resolveNestServerOrigin();
  const url = nestApiUrl(
    origin ?? '',
    `moderator/companies/${companyId}/close-lost`,
  );
  if (!url) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_API_URL is not configured' },
      { status: 503 },
    );
  }
  const body = await req.text();
  const upstream = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: body || '{}',
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
