import { NextResponse } from 'next/server';

import { getCandidateAccessToken } from '@/lib/candidate-access-cookie';
import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const access = await getCandidateAccessToken();
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const origin = resolveNestServerOrigin();
  const url = nestApiUrl(origin ?? '', `candidate/resumes/${id}/download`);
  if (!url) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_API_URL is not configured' },
      { status: 503 },
    );
  }
  const upstream = await fetch(url, {
    headers: {
      Authorization: `Bearer ${access}`,
    },
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
  const buf = await upstream.arrayBuffer();
  const ct = upstream.headers.get('Content-Type') ?? 'application/octet-stream';
  const cd = upstream.headers.get('Content-Disposition');
  const headers = new Headers();
  headers.set('Content-Type', ct);
  if (cd) {
    headers.set('Content-Disposition', cd);
  }
  return new NextResponse(buf, { status: 200, headers });
}
