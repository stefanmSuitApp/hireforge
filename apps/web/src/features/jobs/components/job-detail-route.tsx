import { notFound, permanentRedirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { resolveNestPublicOrigin } from '@/lib/nest-api-url';
import { fetchPublicJobDetail } from '@/lib/public-jobs';

import { JobDetailScreen } from './job-detail-screen';

type Props = {
  params: Promise<{ locale: string; jobRef: string }>;
};

/** Server entry: loads job, renders {@link JobDetailScreen}. */
export async function JobDetailRoute({ params }: Props) {
  const { locale, jobRef } = await params;
  setRequestLocale(locale);
  const base = resolveNestPublicOrigin();

  if (!base) {
    return <JobDetailScreen kind="no-api" />;
  }

  const result = await fetchPublicJobDetail(base, jobRef);
  if (!result.ok) {
    if (result.status === 404 || result.status === 400) {
      notFound();
    }
    return <JobDetailScreen kind="error" />;
  }

  // UUID links and slugs from before an edit 301 to the current slug.
  if (result.data.slug && result.data.slug !== jobRef) {
    permanentRedirect(`/${locale}/jobs/${result.data.slug}`);
  }

  return <JobDetailScreen kind="ok" job={result.data} viewedSegment={jobRef} />;
}
