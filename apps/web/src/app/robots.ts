import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';

import { absoluteSiteOrigin } from '@/lib/site-origin';
import { buildRobots } from '@/lib/seo/robots';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const h = await headers();
  return buildRobots(
    absoluteSiteOrigin(),
    h.get('x-forwarded-host') ?? h.get('host'),
  );
}
