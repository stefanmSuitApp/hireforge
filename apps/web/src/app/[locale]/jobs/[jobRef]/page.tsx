import type { Metadata } from 'next';

import { JobDetailRoute, buildJobDetailMetadata } from '@/features/jobs';
import { publicJobsEnabled } from 'shared';

import { requireSessionUnlessPublicJobs } from '@/lib/public-jobs-gate';

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
  await requireSessionUnlessPublicJobs(locale, `/jobs/${jobRef}`);

  return (
    <JobDetailRoute params={params} structuredData={publicJobsEnabled()} />
  );
}
