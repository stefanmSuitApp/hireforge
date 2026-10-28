import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { buildPublicPageMetadata, NOINDEX } from '@/i18n/metadata';
import { publicJobUrlSegment } from '@/lib/job-public-segment';
import { resolveNestPublicOrigin } from '@/lib/nest-api-url';
import {
  fetchPublicJobDetail,
  isPublicApiOutage,
  PublicApiUnavailableError,
} from '@/lib/public-jobs';

function cleanMetaDescription(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 160);
}

export async function buildJobDetailMetadata(
  params: Promise<{ locale: string; jobRef: string }>,
): Promise<Metadata> {
  const { locale, jobRef } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('JobDetail');
  const base = resolveNestPublicOrigin();
  if (!base) {
    return { title: t('fallbackTitle'), robots: NOINDEX };
  }
  const result = await fetchPublicJobDetail(base, jobRef);
  if (!result.ok) {
    if (isPublicApiOutage(result)) {
      throw new PublicApiUnavailableError('job metadata', result);
    }
    return { title: t('fallbackTitle'), robots: NOINDEX };
  }
  const job = result.data;
  const where = job.city
    ? locale === 'en'
      ? (job.city.nameEn ?? job.city.nameSr)
      : job.city.nameSr
    : null;
  const lead = t('metaDescriptionLead', {
    company: job.company.name,
    city: where ?? '',
    hasCity: where ? 'yes' : 'no',
  });
  return buildPublicPageMetadata({
    locale,
    path: `/jobs/${publicJobUrlSegment(job)}`,
    title: `${job.title} · ${job.company.name}`,
    description: cleanMetaDescription(
      `${lead} ${job.description || job.title}`,
    ),
    // An ended ad stays reachable for visitors, but leaves the index.
    noindex: !job.live,
  });
}
