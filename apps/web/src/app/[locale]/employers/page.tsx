import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { EmployersDirectoryView } from '@/features/employers/components/employers-directory-view';
import { buildPublicPageMetadata } from '@/i18n/metadata';
import { getCandidateAccessToken } from '@/lib/candidate-access-cookie';
import { getEmployerAccessToken } from '@/lib/employer-access-cookie';
import { getStaffAccessToken } from '@/lib/moderator-access-cookie';
import { resolveNestPublicOrigin } from '@/lib/nest-api-url';
import { fetchPublicEmployersDirectory } from '@/lib/public-jobs';
import { requireSessionUnlessPublicJobs } from '@/lib/public-jobs-gate';
import { publicJobsEnabled } from 'shared';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('EmployersPage');
  return buildPublicPageMetadata({
    locale,
    path: '/employers',
    title: t('metaTitle'),
    // The visible intro: long enough for a search snippet (50–160 chars).
    description: t('description'),
  });
}

export default async function EmployersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireSessionUnlessPublicJobs(locale, '/employers');

  // The API needs a token for the directory only while jobs are not public.
  const accessToken = publicJobsEnabled()
    ? undefined
    : ((await getStaffAccessToken()) ??
      (await getEmployerAccessToken()) ??
      (await getCandidateAccessToken()) ??
      undefined);

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
