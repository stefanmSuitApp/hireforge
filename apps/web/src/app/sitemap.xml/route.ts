import { absoluteSiteOrigin } from '@/lib/site-origin';
import { sitemapIndexXml } from '@/lib/seo/sitemap';
import { loadSitemapFiles, newestLastmod } from '@/lib/seo/sitemap-files';

// Built per request from live data (fetches are cached 5 min); never at build
// time, when the API isn't reachable.
export const dynamic = 'force-dynamic';

/** Sitemap index: one child file per kind (pages, landing, companies, jobs). */
export async function GET() {
  const files = await loadSitemapFiles();
  const xml = sitemapIndexXml(
    absoluteSiteOrigin(),
    [...files.entries()].map(([name, entries]) => ({
      name,
      lastmod: newestLastmod(entries),
    })),
  );
  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
}
