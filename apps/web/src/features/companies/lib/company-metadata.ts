import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { buildPublicPageMetadata, NOINDEX } from '@/i18n/metadata';
import { fetchCmsEmployerBranding } from '@/lib/cms-content';
import { resolveNestPublicOrigin } from '@/lib/nest-api-url';
import {
  fetchPublicCompanyDetail,
  isPublicApiOutage,
  PublicApiUnavailableError,
} from '@/lib/public-jobs';

export async function buildCompanyPublicMetadata(
  params: Promise<{ locale: string; slug: string }>,
): Promise<Metadata> {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Company');
  const base = resolveNestPublicOrigin();
  if (!base) return { title: t('fallbackTitle'), robots: NOINDEX };

  const [result, branding] = await Promise.all([
    fetchPublicCompanyDetail(base, slug),
    fetchCmsEmployerBranding(slug, locale),
  ]);
  if (!result.ok) {
    if (isPublicApiOutage(result)) {
      throw new PublicApiUnavailableError('company metadata', result);
    }
    return { title: t('fallbackTitle'), robots: NOINDEX };
  }

  const companyName = result.data.company.name;
  const cmsLead = branding?.heroSubhead?.trim();
  const description = cmsLead
    ? cmsLead.length <= 320
      ? cmsLead
      : `${cmsLead.slice(0, 317)}…`
    : t('metaDescription', { company: companyName });

  return buildPublicPageMetadata({
    locale,
    path: `/companies/${slug}`,
    title: `${companyName} · ${t('titleSuffix')}`,
    description,
    // No live jobs: nothing to find here; keep it out of the index.
    noindex: result.data.jobs.length === 0,
  });
}
