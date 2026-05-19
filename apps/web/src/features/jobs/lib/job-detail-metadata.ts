import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { buildLocaleAlternates } from '@/i18n/metadata';
import { publicJobUrlSegment } from '@/lib/job-public-segment';
import { resolveNestPublicOrigin } from '@/lib/nest-api-url';
import { fetchPublicJobDetail } from '@/lib/public-jobs';

function cleanMetaDescription(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 180);
}

export async function buildJobDetailMetadata(
  params: Promise<{ locale: string; jobRef: string }>,
): Promise<Metadata> {
  const { locale, jobRef } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('JobDetail');
  const base = resolveNestPublicOrigin();
  if (!base) {
    return { title: t('fallbackTitle') };
  }
  const result = await fetchPublicJobDetail(base, jobRef);
  if (!result.ok) {
    return { title: t('fallbackTitle') };
  }
  const pathSegment = publicJobUrlSegment(result.data);
  return {
    title: `${result.data.title} · ${result.data.company.name}`,
    description: cleanMetaDescription(result.data.description),
    alternates: buildLocaleAlternates(locale, `/jobs/${pathSegment}`),
  };
}
