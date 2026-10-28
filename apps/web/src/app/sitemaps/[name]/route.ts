import { absoluteSiteOrigin } from '@/lib/site-origin';
import { urlsetXml } from '@/lib/seo/sitemap';
import { loadSitemapFiles } from '@/lib/seo/sitemap-files';

// Built per request from live data (fetches are cached 5 min); never at build
// time, when the API isn't reachable.
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const entries = (await loadSitemapFiles()).get(name);
  if (!entries) {
    return new Response('Not found', { status: 404 });
  }
  return new Response(urlsetXml(absoluteSiteOrigin(), entries), {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
}
