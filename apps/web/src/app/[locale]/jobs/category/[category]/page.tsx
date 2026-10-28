import type { Metadata } from 'next';

import {
  buildJobsLandingMetadata,
  JobsLandingRoute,
} from '@/features/jobs/components/jobs-landing-route';
import type { JobsSearchParams } from '@/features/jobs/lib/jobs-list-query';
import { requireSessionUnlessPublicJobs } from '@/lib/public-jobs-gate';

type Props = {
  params: Promise<{ locale: string; category: string }>;
  searchParams: Promise<JobsSearchParams>;
};

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { category } = await params;
  return buildJobsLandingMetadata(params, { category }, searchParams);
}

export default async function JobsCategoryPage({
  params,
  searchParams,
}: Props) {
  const { locale, category } = await params;
  await requireSessionUnlessPublicJobs(locale, `/jobs/category/${category}`);
  return (
    <JobsLandingRoute
      params={params}
      searchParams={searchParams}
      landing={{ category }}
    />
  );
}
