import { NextResponse } from 'next/server';

import { forwardClientIpHeaders } from '@/lib/client-ip';
import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';

/**
 * Forwards a JSON POST to Nest `path` (client IP + optional bearer token) and
 * relays the upstream status/body unchanged.
 */
export async function proxyNestPost(
  req: Request,
  path: string,
  accessToken?: string,
): Promise<NextResponse> {
  const url = nestApiUrl(resolveNestServerOrigin() ?? '', path);
  if (!url) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_API_URL is not configured' },
      { status: 503 },
    );
  }
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const upstream = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...forwardClientIpHeaders(req.headers),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
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
