import type { MetadataRoute } from 'next';

import { absoluteSiteOrigin } from '@/lib/site-origin';

export default function robots(): MetadataRoute.Robots {
  const base = absoluteSiteOrigin();
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${base}/sitemap.xml`,
  };
}
