import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { buildLocaleAlternates } from '@/i18n/metadata';

import { fetchCmsEditorialPage } from './cms-content';

export async function buildEditorialPublicMetadata(
  params: Promise<{ locale: string; slug: string }>,
): Promise<Metadata> {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Editorial');
  const doc = await fetchCmsEditorialPage(slug, locale);
  if (!doc) {
    return {
      title: t('fallbackTitle'),
      robots: { index: false, follow: false },
    };
  }

  const titleBase =
    doc.seoTitle?.trim() || doc.title?.trim() || t('fallbackTitle');
  const rawDesc = doc.seoDescription?.trim() || doc.excerpt?.trim() || '';
  const description = rawDesc ? rawDesc.slice(0, 320) : t('defaultDescription');

  return {
    title: titleBase,
    description,
    alternates: buildLocaleAlternates(
      locale,
      slug === 'about-hireforge' ? '/about' : `/p/${slug}`,
    ),
  };
}
