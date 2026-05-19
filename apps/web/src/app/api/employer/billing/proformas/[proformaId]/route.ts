import { NextResponse } from 'next/server';

import { getEmployerAccessToken } from '@/lib/employer-access-cookie';
import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ proformaId: string }> },
) {
  const access = await getEmployerAccessToken();
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { proformaId } = await ctx.params;
  const origin = resolveNestServerOrigin();
  const url = nestApiUrl(
    origin ?? '',
    `employer/billing/proformas/${proformaId}`,
  );
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
