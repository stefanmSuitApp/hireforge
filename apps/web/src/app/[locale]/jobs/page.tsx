import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import {
  JobsListRoute,
  buildJobsListMetadata,
  type JobsSearchParams,
} from '@/features/jobs';
import { hasAnyAuthSession } from '@/lib/unified-auth';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<JobsSearchParams>;
}): Promise<Metadata> {
  return buildJobsListMetadata(params, searchParams);
}

export default async function JobsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<JobsSearchParams>;
}) {
  const { locale } = await params;
  const isAuthenticated = await hasAnyAuthSession();

  if (!isAuthenticated) {
    redirect(`/${locale}/sign-in?returnTo=${encodeURIComponent(`/${locale}/jobs`)}`);
  }

  return <JobsListRoute params={params} searchParams={searchParams} />;
}
