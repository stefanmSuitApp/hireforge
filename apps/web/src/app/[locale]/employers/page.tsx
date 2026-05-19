import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { EmployersDirectoryView } from '@/features/employers/components/employers-directory-view';
import { buildLocaleAlternates } from '@/i18n/metadata';
import { getCandidateAccessToken } from '@/lib/candidate-access-cookie';
import { getEmployerAccessToken } from '@/lib/employer-access-cookie';
import { getStaffAccessToken } from '@/lib/moderator-access-cookie';
import { resolveNestPublicOrigin } from '@/lib/nest-api-url';
import { fetchPublicEmployersDirectory } from '@/lib/public-jobs';
import { hasAnyAuthSession } from '@/lib/unified-auth';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('EmployersPage');
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: buildLocaleAlternates(locale, '/employers'),
  };
}

export default async function EmployersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAuthenticated = await hasAnyAuthSession();

  if (!isAuthenticated) {
    redirect(
      `/${locale}/sign-in?returnTo=${encodeURIComponent(`/${locale}/employers`)}`,
    );
  }

  const accessToken =
    (await getStaffAccessToken()) ??
    (await getEmployerAccessToken()) ??
    (await getCandidateAccessToken());

  if (!accessToken) {
    redirect(
      `/${locale}/sign-in?returnTo=${encodeURIComponent(`/${locale}/employers`)}`,
    );
  }

  setRequestLocale(locale);

  const base = resolveNestPublicOrigin();
  if (!base) {
    return <EmployersDirectoryView kind="no-api" locale={locale} />;
  }

  const result = await fetchPublicEmployersDirectory(base, accessToken);
  if (!result.ok) {
    return <EmployersDirectoryView kind="error" locale={locale} />;
  }

  return (
    <EmployersDirectoryView
      kind="ok"
      locale={locale}
      items={result.data.items}
    />
  );
}
