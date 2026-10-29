import { notFound, permanentRedirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { JsonLd } from '@/components/json-ld';
import { resolveNestPublicOrigin } from '@/lib/nest-api-url';
import { publicJobUrlSegment } from '@/lib/job-public-segment';
import {
  fetchPublicCompanyDetail,
  fetchPublicJobDetail,
  isPublicApiOutage,
  PublicApiUnavailableError,
} from '@/lib/public-jobs';
import { breadcrumbJsonLd, jobPostingJsonLd } from '@/lib/seo/json-ld';
import { absoluteSiteOrigin } from '@/lib/site-origin';
import { hasAnyAuthSession } from '@/lib/unified-auth';

import { JobDetailScreen } from './job-detail-screen';

type Props = {
  params: Promise<{ locale: string; jobRef: string }>;
  /**
   * Emit JobPosting JSON-LD (off with `PUBLIC_JOBS=false`). Passed in by the
   * page: this module is re-exported by the client-reachable `features/jobs`
   * barrel, so it must not import the server-only `shared` lib.
   */
  structuredData: boolean;
};

/** Server entry: loads job, renders {@link JobDetailScreen}. */
export async function JobDetailRoute({ params, structuredData }: Props) {
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
    if (isPublicApiOutage(result)) {
      throw new PublicApiUnavailableError('job', result);
    }
    return <JobDetailScreen kind="error" />;
  }

  // UUID links and slugs from before an edit 301 to the current slug.
  if (result.data.slug && result.data.slug !== jobRef) {
    permanentRedirect(`/${locale}/jobs/${result.data.slug}`);
  }

  const job = result.data;
  const origin = absoluteSiteOrigin();
  const jobUrl = `${origin}/${locale}/jobs/${job.slug ?? job.id}`;
  const tNav = await getTranslations('Nav');
  const company = await fetchPublicCompanyDetail(base, job.company.slug);
  const moreFromCompany = company.ok
    ? company.data.jobs
        .filter((j) => j.id !== job.id)
        .slice(0, 5)
        .map((j) => ({
          title: j.title,
          href: `/jobs/${publicJobUrlSegment(j)}`,
        }))
    : [];

  return (
    <>
      {structuredData ? (
        <JsonLd
          data={[
            jobPostingJsonLd(job, {
              origin,
              locale,
              jobUrl,
              companyUrl: `${origin}/${locale}/companies/${job.company.slug}`,
            }),
            breadcrumbJsonLd([
              { name: tNav('home'), url: `${origin}/${locale}` },
              { name: tNav('jobs'), url: `${origin}/${locale}/jobs` },
              { name: job.title, url: jobUrl },
            ]),
          ]}
        />
      ) : null}
      <JobDetailScreen
        kind="ok"
        job={job}
        viewedSegment={jobRef}
        guest={!(await hasAnyAuthSession())}
        moreFromCompany={moreFromCompany}
      />
    </>
  );
}
