import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { buildLocaleAlternates } from '@/i18n/metadata';
import { fetchCmsEmployerBranding } from '@/lib/cms-content';
import { resolveNestPublicOrigin } from '@/lib/nest-api-url';
import { fetchPublicCompanyDetail } from '@/lib/public-jobs';

export async function buildCompanyPublicMetadata(
  params: Promise<{ locale: string; slug: string }>,
): Promise<Metadata> {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Company');
  const base = resolveNestPublicOrigin();
  if (!base) return { title: t('fallbackTitle') };

  const [result, branding] = await Promise.all([
    fetchPublicCompanyDetail(base, slug),
    fetchCmsEmployerBranding(slug, locale),
  ]);
  if (!result.ok) return { title: t('fallbackTitle') };

  const companyName = result.data.company.name;
  const cmsLead = branding?.heroSubhead?.trim();
  const description = cmsLead
    ? cmsLead.length <= 320
      ? cmsLead
      : `${cmsLead.slice(0, 317)}…`
    : t('metaDescription', { company: companyName });

  return {
    title: `${companyName} · ${t('titleSuffix')}`,
    description,
    alternates: buildLocaleAlternates(locale, `/companies/${slug}`),
  };
}
