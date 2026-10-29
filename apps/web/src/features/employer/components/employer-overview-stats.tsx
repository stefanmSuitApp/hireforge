'use client';

import type { EmployerJobPostingSlot } from 'contracts';
import { useFormatter, useTranslations } from 'next-intl';

import { TableLoadingState } from '@/components/query/table-loading-state';
import { useEmployerJobsQuery } from '@/hooks/queries';
import { Link } from '@/i18n/navigation';

import { employerOverview } from '../lib/employer-overview';

type Props = {
  slots: EmployerJobPostingSlot[];
  /** `no_subscription` / `pending_payment`: the slots tile says why it's empty. */
  postingKind: 'eligible' | 'no_subscription' | 'pending_payment';
};

function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  const body = (
    <>
      <p className="m-0 text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="m-0 mt-2 text-2xl font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </>
  );
  return href ? (
    <Link
      href={href}
      className="block rounded-xl border border-border/70 bg-card p-4 transition-colors hover:border-primary/50"
    >
      {body}
    </Link>
  ) : (
    <div className="rounded-xl border border-border/70 bg-card p-4">{body}</div>
  );
}

export function EmployerOverviewStats({ slots, postingKind }: Props) {
  const t = useTranslations('Employer.home');
  const format = useFormatter();
  const jobs = useEmployerJobsQuery();

  if (jobs.isLoading) return <TableLoadingState />;
  if (jobs.isError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {t('loadError')}
      </p>
    );
  }

  const o = employerOverview(jobs.data ?? [], slots);
  const slotsValue = o.slots
    ? t('slotsValue', { free: o.slots.free, max: o.slots.max })
    : postingKind === 'pending_payment'
      ? t('slotsPendingPayment')
      : t('slotsNone');

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={t('statLive')}
          value={String(o.live)}
          href="/employer/jobs"
        />
        <Stat
          label={t('statInReview')}
          value={String(o.inReview)}
          href="/employer/jobs"
        />
        <Stat label={t('statApplicants')} value={String(o.applicants)} />
        <Stat
          label={t('statSlots')}
          value={slotsValue}
          href="/employer/packages"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/70 bg-card p-5">
          <h3 className="m-0 text-base font-semibold text-foreground">
            {t('applicantsTitle')}
          </h3>
          {o.withApplicants.length ? (
            <ul className="m-0 mt-3 list-none space-y-2 p-0">
              {o.withApplicants.map((job) => (
                <li
                  key={job.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <Link
                    href={`/employer/jobs/${job.id}/applications`}
                    className="min-w-0 truncate font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {job.title}
                  </Link>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {t('applicantsCount', { count: job.applicationCount })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 mt-2 text-sm text-muted-foreground">
              {t('applicantsEmpty')}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-5">
          <h3 className="m-0 text-base font-semibold text-foreground">
            {t('expiringTitle')}
          </h3>
          {o.expiringSoon.length ? (
            <ul className="m-0 mt-3 list-none space-y-2 p-0">
              {o.expiringSoon.map((job) => (
                <li
                  key={job.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <Link
                    href={job.slug ? `/jobs/${job.slug}` : '/employer/jobs'}
                    className="min-w-0 truncate font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {job.title}
                  </Link>
                  <span className="shrink-0 text-muted-foreground">
                    {job.expiresAt
                      ? format.dateTime(new Date(job.expiresAt), {
                          dateStyle: 'medium',
                        })
                      : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 mt-2 text-sm text-muted-foreground">
              {t('expiringEmpty')}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
