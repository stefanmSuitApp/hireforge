import type { Metadata } from 'next';

import {
  JobsListRoute,
  buildJobsListMetadata,
  type JobsSearchParams,
} from '@/features/jobs';
import { requireSessionUnlessPublicJobs } from '@/lib/public-jobs-gate';

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
  await requireSessionUnlessPublicJobs(locale, '/jobs');

  return <JobsListRoute params={params} searchParams={searchParams} />;
}
