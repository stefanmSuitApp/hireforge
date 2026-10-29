import { getTranslations } from 'next-intl/server';
import { publicJobsEnabled } from 'shared';

import { absoluteSiteOrigin } from '@/lib/site-origin';

/** `/llms.txt`: a plain map of the public site for LLM-based crawlers. */
export const dynamic = 'force-dynamic';

export async function GET() {
  const origin = absoluteSiteOrigin();
  const t = await getTranslations({ locale: 'en', namespace: 'Metadata' });
  const jobs = publicJobsEnabled()
    ? [
        `- [Jobs](${origin}/en/jobs): every open job ad (Serbian: ${origin}/sr/jobs)`,
        `- Job ads: ${origin}/{sr|en}/jobs/{slug}`,
        `- By city or category: ${origin}/{sr|en}/jobs/city/{city}, ${origin}/{sr|en}/jobs/category/{category}`,
        `- [Employers](${origin}/en/employers): companies with open jobs, each at ${origin}/{sr|en}/companies/{slug}`,
      ]
    : [];
  const body = [
    '# Šljakam (sljakam.com)',
    '',
    `> ${t('description')}`,
    '',
    'Pages exist in Serbian (/sr) and English (/en).',
    '',
    '## Public sections',
    '',
    `- [Home](${origin}/en)`,
    ...jobs,
    `- [Sitemap](${origin}/sitemap.xml)`,
    '',
  ].join('\n');
  return new Response(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
