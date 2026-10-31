import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import { COMPANY_LOGOS_TAG } from '@/lib/company-logos';
import { forwardClientIpHeaders } from '@/lib/client-ip';
import { isUuidString } from '@/lib/job-public-segment';
import { getStaffAccessToken } from '@/lib/moderator-access-cookie';
import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';

type Ctx = { params: Promise<{ companyId: string }> };

/** Upload (POST, multipart `file`) or remove (DELETE) a company's logo. */
async function forward(req: Request, ctx: Ctx, method: 'POST' | 'DELETE') {
  const access = await getStaffAccessToken();
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { companyId } = await ctx.params;
  // Params are URL-decoded: validate before building the upstream path.
  if (!isUuidString(companyId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const url = nestApiUrl(
    resolveNestServerOrigin() ?? '',
    `moderator/companies/${companyId}/logo`,
  );
  if (!url) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_API_URL is not configured' },
      { status: 503 },
    );
  }
  let body: FormData | undefined;
  if (method === 'POST') {
    const file = (await req.formData()).get('file');
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: 'Missing file field "file"' },
        { status: 400 },
      );
    }
    body = new FormData();
    body.append('file', file, file.name || 'logo');
  }
  const upstream = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${access}`,
      ...forwardClientIpHeaders(req.headers),
    },
    body,
    cache: 'no-store',
  });
  // Every page reads the logo map from the layout: refresh it now.
  if (upstream.ok) revalidateTag(COMPANY_LOGOS_TAG, { expire: 0 });
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      'Content-Type':
        upstream.headers.get('Content-Type') ?? 'application/json',
    },
  });
}

export function POST(req: Request, ctx: Ctx) {
  return forward(req, ctx, 'POST');
}

export function DELETE(req: Request, ctx: Ctx) {
  return forward(req, ctx, 'DELETE');
}
