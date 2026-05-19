import type { MetadataRoute } from 'next';

import { routing } from '@/i18n/routing';
import { absoluteSiteOrigin } from '@/lib/site-origin';

const STATIC_PATHS = ['', '/jobs', '/employers', '/sign-in'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = absoluteSiteOrigin();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    for (const p of STATIC_PATHS) {
      const pathname = p ? `/${locale}${p}` : `/${locale}`;
      const url = `${base}${pathname}`;
      const languages: Record<string, string> = {};
      for (const l of routing.locales) {
        const lp = p ? `/${l}${p}` : `/${l}`;
        languages[l] = `${base}${lp}`;
      }
      languages['x-default'] = `${base}/${routing.defaultLocale}${p}`;
      entries.push({
        url,
        changeFrequency: p === '' ? 'daily' : 'weekly',
        priority: p === '' ? 1 : 0.8,
        alternates: { languages },
      });
    }
  }

  return entries;
}
