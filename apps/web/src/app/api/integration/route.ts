import { createApiClient } from 'shared';

export const dynamic = 'force-dynamic';

/**
 * Server-side aggregation: Nest `/api/integration` (DB, Redis, BullMQ enqueue, Sanity).
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
    const upstream = await getJson<Record<string, unknown>>('/api/integration');
    return Response.json({ source: 'web/api/integration', upstream });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'upstream_error';
    return Response.json(
      { source: 'web/api/integration', error: message },
      { status: 502 },
    );
  }
}
