import type { EmployerJobDetailResponse } from 'contracts';
import { getLocale, getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { publicJobUrlSegment } from '@/lib/job-public-segment';

type Props = { job: EmployerJobDetailResponse };

export async function EmployerJobReadOnly({ job }: Props) {
  const locale = await getLocale();
  const t = await getTranslations('Employer.jobList');
  const tStatus = await getTranslations('Employer.jobStatus');

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        {job.title}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('readOnlyHint')}</p>

      <div className="mt-6 space-y-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
        <div className="flex flex-wrap gap-2">
          <span className="text-muted-foreground">{t('colStatus')}</span>
          <span className="font-medium text-foreground">
            {tStatus(job.status)}
          </span>
        </div>
        {job.submittedAt ? (
          <p>
            <span className="text-muted-foreground">{t('submittedAt')} </span>
            <time dateTime={job.submittedAt}>
              {new Date(job.submittedAt).toLocaleString()}
            </time>
          </p>
        ) : null}
        {job.publishedAt ? (
          <p>
            <span className="text-muted-foreground">{t('publishedAt')} </span>
            <time dateTime={job.publishedAt}>
              {new Date(job.publishedAt).toLocaleString()}
            </time>
          </p>
        ) : null}
        {job.rejectedReason ? (
          <p className="text-destructive">
            <span className="font-medium">{t('rejectedReason')} </span>
            {job.rejectedReason}
          </p>
        ) : null}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button variant="outline" asChild>
          <Link href="/employer/jobs" locale={locale}>
            {t('backToList')}
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/employer/jobs/${job.id}/applications`} locale={locale}>
            {t('viewApplications')}
          </Link>
        </Button>
        {job.status === 'published' ? (
          <Button asChild>
            <Link href={`/jobs/${publicJobUrlSegment(job)}`} locale={locale}>
              {t('viewPublicListing')}
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
