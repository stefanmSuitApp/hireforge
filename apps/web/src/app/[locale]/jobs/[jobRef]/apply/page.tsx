import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { CandidateJobApplyForm } from '@/features/candidate';
import { getCandidateAccessToken } from '@/lib/candidate-access-cookie';
import { fetchCandidateMe } from '@/lib/fetch-candidate-me';
import { isUuidString, publicJobUrlSegment } from '@/lib/job-public-segment';
import { resolveNestPublicOrigin } from '@/lib/nest-api-url';
import { fetchPublicJobDetail } from '@/lib/public-jobs';

export default async function JobApplyPage({
  params,
}: {
  params: Promise<{ locale: string; jobRef: string }>;
}) {
  const { locale, jobRef } = await params;
  setRequestLocale(locale);

  const base = resolveNestPublicOrigin();
  if (base && isUuidString(jobRef)) {
    const peek = await fetchPublicJobDetail(base, jobRef);
    if (peek.ok && peek.data.slug && peek.data.slug !== jobRef) {
      permanentRedirect(`/${locale}/jobs/${peek.data.slug}/apply`);
    }
  }

  const access = await getCandidateAccessToken();
  if (!access) {
    redirect(
      `/${locale}/candidate/login?returnTo=/${locale}/jobs/${jobRef}/apply`,
    );
  }
  const me = await fetchCandidateMe(access);
  if (!me.ok) {
    redirect(
      `/${locale}/candidate/login?returnTo=/${locale}/jobs/${jobRef}/apply`,
    );
  }

  if (!base) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive">
          NEXT_PUBLIC_API_URL is not configured.
        </p>
      </main>
    );
  }

  const job = await fetchPublicJobDetail(base, jobRef);
  if (!job.ok) {
    notFound();
  }

  if (job.data.applyMode === 'external') {
    redirect(`/${locale}/jobs/${publicJobUrlSegment(job.data)}`);
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 pb-12">
      <CandidateJobApplyForm
        job={job.data}
        emailVerified={me.data.user.emailVerified}
      />
    </main>
  );
}
