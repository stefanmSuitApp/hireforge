import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { buildLocaleAlternates } from '@/i18n/metadata';

import type { JobsSearchParams } from './jobs-list-query';

export async function buildJobsListMetadata(
  params: Promise<{ locale: string }>,
  searchParams: Promise<JobsSearchParams>,
): Promise<Metadata> {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('Jobs');
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const hasFilters = Boolean(
    sp.q?.trim() || sp.city?.trim() || sp.category?.trim(),
  );
  const title =
    page > 1
      ? `${t('title')} — ${t('pageTitleSuffix', { page })}`
      : hasFilters
        ? t('titleFiltered')
        : t('title');
  return {
    title,
    description: t('listDescription'),
    alternates: buildLocaleAlternates(locale, '/jobs'),
  };
}
