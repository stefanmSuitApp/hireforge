import type {
  CandidateApplicationListItem,
  CandidateSavedJobsResponse,
} from 'contracts';
import {
  getFormatter,
  getTranslations,
  setRequestLocale,
} from 'next-intl/server';

import {
  applicationPipelineStatusTone,
  TableStatusBadge,
} from '@/components/table-status-badge';
import { Button } from '@/components/ui/button';
import { candidateOverview } from '@/features/candidate/lib/candidate-overview';
import { Link } from '@/i18n/navigation';
import { loadCandidateSessionOrRedirect } from '@/lib/candidate-workspace-load';
import { fetchCandidateJson } from '@/lib/fetch-candidate-json';
import { fetchCandidateResumes } from '@/lib/fetch-candidate-resumes';
import { publicJobUrlSegment } from '@/lib/job-public-segment';

const cardClass = 'rounded-2xl border border-border/70 bg-card p-5';
const linkClass = 'font-medium text-primary underline-offset-2 hover:underline';

export default async function CandidateHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Candidate.home');
  const tStatus = await getTranslations('Employer.applicationStatus');
  const format = await getFormatter();

  const session = await loadCandidateSessionOrRedirect();
  const [applications, saved, resumes] = await Promise.all([
    fetchCandidateJson<CandidateApplicationListItem[]>(
      session.accessToken,
      'candidate/applications',
    ),
    fetchCandidateJson<CandidateSavedJobsResponse>(
      session.accessToken,
      'candidate/saved-jobs',
    ),
    fetchCandidateResumes(session.accessToken),
  ]);
  const fullName = session.me.candidate.fullName;
  const o = candidateOverview({
    applications: applications.ok ? applications.data : [],
    fullName,
    // Unknown (load failed) is not "missing": don't nag about it.
    resumeCount: resumes.ok ? resumes.data.length : 1,
  });
  const savedJobs = saved.ok ? saved.data.items.slice(0, 5) : [];
  const firstName = fullName?.trim().split(/\s+/)[0];

  return (
    <div className="space-y-6">
      <section className={cardClass}>
        <h2 className="m-0 text-xl font-semibold text-foreground">
          {firstName ? t('headingNamed', { name: firstName }) : t('heading')}
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/jobs">{t('ctaBrowseJobs')}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/candidate/cv/build">{t('ctaBuildCv')}</Link>
          </Button>
        </div>
        {o.missing.length ? (
          <div className="mt-5 rounded-xl border border-warning/40 bg-warning-soft p-4">
            <p className="m-0 text-sm font-semibold text-foreground">
              {t('profileTitle')}
            </p>
            <ul className="m-0 mt-2 list-disc space-y-1 pl-5 text-sm text-foreground">
              {o.missing.map((item) => (
                <li key={item}>
                  <Link href="/candidate/profile" className={linkClass}>
                    {t(item === 'name' ? 'profileName' : 'profileCv')}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/candidate/applications"
          className="block rounded-xl border border-border/70 bg-card p-4 transition-colors hover:border-primary/50"
        >
          <p className="m-0 text-xs uppercase tracking-wide text-muted-foreground">
            {t('statApplications')}
          </p>
          <p className="m-0 mt-2 text-2xl font-semibold tabular-nums text-foreground">
            {o.applications}
          </p>
        </Link>
        <div className="rounded-xl border border-border/70 bg-card p-4">
          <p className="m-0 text-xs uppercase tracking-wide text-muted-foreground">
            {t('statInProgress')}
          </p>
          <p className="m-0 mt-2 text-2xl font-semibold tabular-nums text-foreground">
            {o.inProgress}
          </p>
        </div>
        <div className="rounded-xl border border-border/70 bg-card p-4">
          <p className="m-0 text-xs uppercase tracking-wide text-muted-foreground">
            {t('statSaved')}
          </p>
          <p className="m-0 mt-2 text-2xl font-semibold tabular-nums text-foreground">
            {saved.ok ? saved.data.items.length : '—'}
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className={cardClass}>
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="m-0 text-base font-semibold text-foreground">
              {t('recentTitle')}
            </h3>
            {o.applications > 0 ? (
              <Link href="/candidate/applications" className={linkClass}>
                {t('seeAll')}
              </Link>
            ) : null}
          </div>
          {!applications.ok ? (
            <p className="m-0 mt-2 text-sm text-destructive" role="alert">
              {t('loadError')}
            </p>
          ) : o.recent.length ? (
            <ul className="m-0 mt-3 list-none space-y-3 p-0">
              {o.recent.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 text-sm">
                    <Link
                      href={`/jobs/${publicJobUrlSegment({ slug: a.jobSlug, id: a.jobId })}`}
                      className={`${linkClass} block truncate`}
                    >
                      {a.jobTitle}
                    </Link>
                    <span className="text-muted-foreground">
                      {a.companyName} ·{' '}
                      {format.dateTime(new Date(a.createdAt), {
                        dateStyle: 'medium',
                      })}
                    </span>
                  </div>
                  <TableStatusBadge
                    label={tStatus(a.status as Parameters<typeof tStatus>[0])}
                    tone={applicationPipelineStatusTone(a.status)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 mt-2 text-sm text-muted-foreground">
              {t('recentEmpty')}
            </p>
          )}
        </div>

        <div className={cardClass}>
          <h3 className="m-0 text-base font-semibold text-foreground">
            {t('savedTitle')}
          </h3>
          {savedJobs.length ? (
            <ul className="m-0 mt-3 list-none space-y-3 p-0">
              {savedJobs.map((job) => (
                <li key={job.id} className="min-w-0 text-sm">
                  <Link
                    href={`/jobs/${publicJobUrlSegment(job)}`}
                    className={`${linkClass} block truncate`}
                  >
                    {job.title}
                  </Link>
                  <span className="text-muted-foreground">
                    {job.company.name}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 mt-2 text-sm text-muted-foreground">
              {t('savedEmpty')}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
