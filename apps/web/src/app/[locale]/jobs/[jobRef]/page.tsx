import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { JobDetailRoute, buildJobDetailMetadata } from '@/features/jobs';
import { hasAnyAuthSession } from '@/lib/unified-auth';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; jobRef: string }>;
}): Promise<Metadata> {
  return buildJobDetailMetadata(params);
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ locale: string; jobRef: string }>;
}) {
  const { locale, jobRef } = await params;
  const isAuthenticated = await hasAnyAuthSession();

  if (!isAuthenticated) {
    const returnTo = encodeURIComponent(`/${locale}/jobs/${jobRef}`);
    redirect(`/${locale}/sign-in?returnTo=${returnTo}`);
  }

  return <JobDetailRoute params={params} />;
}
