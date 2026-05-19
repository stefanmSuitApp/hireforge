import { NextResponse } from 'next/server';

import { getStaffAccessToken } from '@/lib/moderator-access-cookie';
import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';

export async function GET(req: Request) {
  const access = await getStaffAccessToken();
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const origin = resolveNestServerOrigin();
  const base = nestApiUrl(origin ?? '', 'admin/audit');
  if (!base) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_API_URL is not configured' },
      { status: 503 },
    );
  }
  const u = new URL(req.url);
  const qs = u.searchParams.toString();
  const url = qs ? `${base}?${qs}` : base;
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
