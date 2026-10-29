import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import { getStaffAccessToken } from '@/lib/moderator-access-cookie';
import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const access = await getStaffAccessToken();
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const origin = resolveNestServerOrigin();
  const url = nestApiUrl(origin ?? '', `admin/campaigns/${id}`);
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
  // The banner and packages page show the change at once, not after 60 s.
  if (upstream.ok) revalidateTag('public:campaign', { expire: 0 });
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      'Content-Type':
        upstream.headers.get('Content-Type') ?? 'application/json',
    },
  });
}
