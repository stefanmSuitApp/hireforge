'use client';

import type { UserRole } from 'contracts';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { TableErrorBoundary } from '@/components/query/table-error-boundary';
import { TableLoadingState } from '@/components/query/table-loading-state';
import { Button } from '@/components/ui/button';
import { useStaffCompaniesQuery } from '@/hooks/queries';

import { ModeratorCompaniesTable } from './moderator-companies-table';

type Props = { locale: string; staffRole: UserRole };

export function ModeratorCompaniesSection({ locale, staffRole }: Props) {
  const t = useTranslations('Moderator.companies');
  const [view, setView] = useState<'my' | 'pool' | 'all'>(() =>
    staffRole === 'admin' ? 'all' : 'my',
  );

  const queryString = useMemo(() => {
    const p = new URLSearchParams({ limit: '200', offset: '0' });
    if (staffRole === 'admin' && view === 'all') {
      p.set('view', 'all');
    } else if (view === 'my') {
      p.set('view', 'my');
    } else if (view === 'pool') {
      p.set('view', 'pool');
    }
    return p.toString();
  }, [view, staffRole]);

  const query = useStaffCompaniesQuery(queryString);

  return (
    <TableErrorBoundary
      fallback={
        <p className="text-sm text-destructive" role="alert">
          {t('empty')}
        </p>
      }
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={view === 'my' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('my')}
          >
            {t('viewMy')}
          </Button>
          <Button
            type="button"
            variant={view === 'pool' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('pool')}
          >
            {t('viewPool')}
          </Button>
          {staffRole === 'admin' ? (
            <Button
              type="button"
              variant={view === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('all')}
            >
              {t('viewAll')}
            </Button>
          ) : null}
        </div>
        {query.data ? (
          <p className="text-sm text-muted-foreground">
            {t('total', { count: query.data.total })}
          </p>
        ) : null}
      </div>
      {query.isLoading ? <TableLoadingState /> : null}
      {query.isError ? (
        <p className="text-sm text-destructive" role="alert">
          {t('empty')}
        </p>
      ) : null}
      {query.data ? (
        <ModeratorCompaniesTable items={query.data.items} locale={locale} />
      ) : null}
    </TableErrorBoundary>
  );
}
