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
    `employer/billing/proformas/${proformaId}/pdf`,
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
      Accept: 'application/pdf',
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
  const buf = Buffer.from(await upstream.arrayBuffer());
  const cd =
    upstream.headers.get('Content-Disposition') ??
    `attachment; filename="proforma.pdf"`;
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': cd,
    },
  });
}
