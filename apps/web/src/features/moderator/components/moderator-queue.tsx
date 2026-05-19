'use client';

import type {
  ModeratorJobQueueItem,
  ModeratorJobQueueResponse,
} from 'contracts';
import { Eye, MoreHorizontal } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

import {
  jobListingStatusTone,
  TableStatusBadge,
} from '@/components/table-status-badge';
import {
  Button,
  DataTable,
  type DataTableColumn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Label,
  SelectField,
} from '@/components/ui';
import { useModeratorQueueQuery } from '@/hooks/queries';
import type { AppLocale } from '@/i18n/localized-path';
import { Link, useRouter } from '@/i18n/navigation';

type Props = { queue: ModeratorJobQueueResponse; initialStatus: string };

const QUEUE_FILTER_STATUSES = [
  'submitted',
  'published',
  'rejected',
  'draft',
  'archived',
] as const;

/** Explicit locale + options so server and browser produce the same string (avoids hydration mismatch). */
function formatQueueSubmittedAt(iso: string, locale: AppLocale): string {
  const d = new Date(iso);
  const tag = locale === 'sr' ? 'sr-Latn-RS' : 'en-GB';
  return new Intl.DateTimeFormat(tag, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(d);
}

export function ModeratorQueue({ queue, initialStatus }: Props) {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('Moderator.queue');
  const tStatus = useTranslations('Employer.jobStatus');
  const queueQuery = useModeratorQueueQuery(initialStatus, queue);
  const data = queueQuery.data;

  const columns = useMemo<DataTableColumn<ModeratorJobQueueItem>[]>(
    () => [
      {
        id: 'title',
        header: t('colTitle'),
        accessorKey: 'title',
        cell: (row) => (
          <span className="font-medium text-foreground">{row.title}</span>
        ),
      },
      {
        id: 'company',
        header: t('colCompany'),
        accessorKey: 'companyLegalName',
        cell: (row) => (
          <span className="text-muted-foreground">{row.companyLegalName}</span>
        ),
      },
      {
        id: 'status',
        header: t('colStatus'),
        accessorKey: 'status',
        cell: (row) => (
          <TableStatusBadge
            label={tStatus(
              row.status as
                | 'draft'
                | 'submitted'
                | 'published'
                | 'rejected'
                | 'archived'
                | 'expired',
            )}
            tone={jobListingStatusTone(row.status)}
          />
        ),
      },
      {
        id: 'submittedAt',
        header: t('colSubmitted'),
        accessorKey: 'submittedAt',
        cell: (row) => (
          <span className="text-muted-foreground">
            {row.submittedAt
              ? formatQueueSubmittedAt(row.submittedAt, locale)
              : '—'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: t('colActions'),
        cell: (row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 [&_svg]:size-3.5"
                aria-label={t('colActions')}
              >
                <MoreHorizontal />
                <span className="sr-only">{t('colActions')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link
                  href={`/moderator/jobs/${row.id}`}
                  locale={locale}
                  className="flex items-center gap-2"
                >
                  <Eye className="size-3.5 text-muted-foreground" />
                  {t('review')}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [locale, t, tStatus],
  );

  const statusOptions = useMemo(
    () =>
      QUEUE_FILTER_STATUSES.map((value) => ({
        value,
        label: tStatus(
          value as
            | 'draft'
            | 'submitted'
            | 'published'
            | 'rejected'
            | 'archived'
            | 'expired',
        ),
      })),
    [tStatus],
  );

  function navigateToStatus(status: string) {
    const next = new URLSearchParams();
    if (status.trim()) {
      next.set('status', status.trim());
    }
    const limit = searchParams.get('limit')?.trim();
    const offset = searchParams.get('offset')?.trim();
    if (limit) next.set('limit', limit);
    if (offset) next.set('offset', offset);
    const qs = next.toString();
    router.push(qs ? `/moderator?${qs}` : '/moderator');
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground">
          {t('heading')}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('lead')}</p>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {t('total', { count: data.total })}
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5 sm:max-w-xs">
          <Label htmlFor="mod-status" className="text-muted-foreground">
            {t('filterStatus')}
          </Label>
          <SelectField
            id="mod-status"
            value={initialStatus}
            onValueChange={navigateToStatus}
            options={statusOptions}
            classNames={{ trigger: 'h-9 w-full min-w-[12rem]' }}
          />
        </div>
      </div>

      <DataTable
        data={data.items}
        columns={columns}
        emptyContent={t('empty')}
        getRowId={(row) => row.id}
      />
      </section>
    </div>
  );
}
