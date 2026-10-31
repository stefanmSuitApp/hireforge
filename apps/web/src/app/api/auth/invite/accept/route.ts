import { NextResponse } from 'next/server';

import { withAcceptedTerms } from '@/features/legal/accepted-terms';
import { forwardClientIpHeaders } from '@/lib/client-ip';
import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';

/**
 * Invited employer sets their first password. Like sign-up, the accepted
 * terms version is added here from the published terms, never by the client.
 */
export async function POST(req: Request) {
  const url = nestApiUrl(resolveNestServerOrigin() ?? '', 'auth/invite/accept');
  if (!url) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_API_URL is not configured' },
      { status: 503 },
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const upstream = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...forwardClientIpHeaders(req.headers),
    },
    body: JSON.stringify(await withAcceptedTerms(body)),
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
