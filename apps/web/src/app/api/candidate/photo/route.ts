import { NextResponse } from 'next/server';

import { getCandidateAccessToken } from '@/lib/candidate-access-cookie';
import { forwardClientIpHeaders } from '@/lib/client-ip';
import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';

/** The candidate's CV photo: upload (POST multipart), view (GET), remove. */
async function upstream(
  req: Request,
  init: RequestInit,
): Promise<Response | NextResponse> {
  const access = await getCandidateAccessToken();
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = nestApiUrl(resolveNestServerOrigin() ?? '', 'candidate/photo');
  if (!url) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_API_URL is not configured' },
      { status: 503 },
    );
  }
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${access}`,
      ...forwardClientIpHeaders(req.headers),
    },
    cache: 'no-store',
  });
}

async function relayJson(res: Response | NextResponse): Promise<NextResponse> {
  if (res instanceof NextResponse) return res;
  return new NextResponse(await res.text(), {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('Content-Type') ?? 'application/json',
    },
  });
}

export async function GET(req: Request) {
  const res = await upstream(req, {});
  if (res instanceof NextResponse || !res.ok) return relayJson(res);
  return new NextResponse(await res.arrayBuffer(), {
    status: 200,
    headers: {
      'Content-Type': 'image/jpeg',
      // Private to the signed-in candidate; the page adds a version query.
      'Cache-Control': 'private, no-store',
    },
  });
}

export async function POST(req: Request) {
  return relayJson(
    await upstream(req, { method: 'POST', body: await req.formData() }),
  );
}

export async function DELETE(req: Request) {
  return relayJson(await upstream(req, { method: 'DELETE' }));
}
