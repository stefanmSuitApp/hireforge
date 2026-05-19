'use client';

import { useTranslations } from 'next-intl';

import { TableErrorBoundary } from '@/components/query/table-error-boundary';
import { TableLoadingState } from '@/components/query/table-loading-state';
import { useCandidateApplicationsQuery } from '@/hooks/queries';

import { CandidateApplicationsTable } from './candidate-applications-table';

export function CandidateApplicationsSection() {
  const t = useTranslations('Candidate.applications');
  const apps = useCandidateApplicationsQuery();
  const items = apps.data ?? [];
  const activeCount = items.filter(
    (item) => item.status === 'submitted' || item.status === 'viewed',
  ).length;
  const closedCount = items.filter(
    (item) => item.status === 'rejected' || item.status === 'withdrawn',
  ).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-border/70 bg-background p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t('metricTotal')}
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {items.length}
          </p>
        </article>
        <article className="rounded-xl border border-border/70 bg-background p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t('metricActive')}
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {activeCount}
          </p>
        </article>
        <article className="rounded-xl border border-border/70 bg-background p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t('metricClosed')}
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {closedCount}
          </p>
        </article>
      </div>
      <TableErrorBoundary>
        {apps.isLoading ? <TableLoadingState /> : null}
        {apps.isError ? (
          <p className="text-sm text-destructive" role="alert">
            {t('loadError')}
          </p>
        ) : null}
        {apps.data ? <CandidateApplicationsTable items={apps.data} /> : null}
      </TableErrorBoundary>
    </div>
  );
}
