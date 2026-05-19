import { createApiClient } from 'shared';

export const dynamic = 'force-dynamic';

/**
 * BFF sample: calls Nest root with `X-Request-Id` so API access logs correlate with this hop.
 */
export async function GET() {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    return Response.json(
      { error: 'NEXT_PUBLIC_API_URL is not set' },
      { status: 503 },
    );
  }

  try {
    const { getJson } = createApiClient({ baseUrl: base });
    const upstream = await getJson<{
      message: string;
      postgres: string;
      redis: string;
    }>('/api');
    return Response.json({ source: 'web/api/hello', upstream });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'upstream_error';
    return Response.json(
      { source: 'web/api/hello', error: message },
      { status: 502 },
    );
  }
}
