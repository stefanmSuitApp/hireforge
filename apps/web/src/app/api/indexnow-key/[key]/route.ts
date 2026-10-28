/**
 * IndexNow ownership proof: `/<INDEXNOW_KEY>.txt` (rewritten here by
 * next.config.js) answers with the key itself. Anything else is a 404.
 */
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  const expected = process.env.INDEXNOW_KEY?.trim();
  if (!expected || key !== expected) {
    return new Response('Not found', { status: 404 });
  }
  return new Response(expected, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
