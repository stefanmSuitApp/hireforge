'use client';

import type { CandidateApplicationListItem } from 'contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { patchCandidateApplicationWithdraw } from '@/api/candidate-auth';
import {
  applicationPipelineStatusTone,
  TableStatusBadge,
} from '@/components/table-status-badge';
import { Button } from '@/components/ui/button';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { tableQueryKeys } from '@/hooks/queries/table-query-keys';
import { Link } from '@/i18n/navigation';
import {
  getTranslatedApiErrorMessage,
  type ErrorsTranslator,
} from '@/lib/http/api-error-message';
import { publicJobUrlSegment } from '@/lib/job-public-segment';

type Props = { items: CandidateApplicationListItem[] };

type ApplicationStatusUiKey =
  | 'submitted'
  | 'viewed'
  | 'shortlisted'
  | 'withdrawn'
  | 'reviewed'
  | 'rejected'
  | 'hired';

export function CandidateApplicationsTable({ items }: Props) {
  const t = useTranslations('Candidate.applications');
  const tStatus = useTranslations('Employer.applicationStatus');
  const tErrors = useTranslations('Errors');
  const queryClient = useQueryClient();

  const [withdrawError, setWithdrawError] = React.useState<string | null>(null);

  const withdrawMutation = useMutation({
    mutationFn: patchCandidateApplicationWithdraw,
    onMutate: () => {
      setWithdrawError(null);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: tableQueryKeys.candidateApplications(),
      });
    },
    onError: (err) => {
      setWithdrawError(
        getTranslatedApiErrorMessage(err, tErrors as ErrorsTranslator),
      );
    },
  });

  const columns = React.useMemo<
    DataTableColumn<CandidateApplicationListItem>[]
  >(
    () => [
      {
        id: 'job',
        header: t('colJob'),
        cell: (row) => (
          <div>
            <Link
              href={`/jobs/${publicJobUrlSegment({ slug: row.jobSlug, id: row.jobId })}`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {row.jobTitle}
            </Link>
            <p className="text-xs text-muted-foreground">{row.companyName}</p>
          </div>
        ),
      },
      {
        id: 'status',
        header: t('colStatus'),
        cell: (row) => (
          <TableStatusBadge
            label={tStatus(row.status as ApplicationStatusUiKey)}
            tone={applicationPipelineStatusTone(row.status)}
          />
        ),
      },
      {
        id: 'resume',
        header: t('colResume'),
        cell: (row) => row.resumeOriginalFilename ?? '—',
      },
      {
        id: 'applied',
        header: t('colApplied'),
        accessorKey: 'createdAt',
        cell: (row) => (
          <span className="text-muted-foreground">
            <time dateTime={row.createdAt}>
              {new Date(row.createdAt).toLocaleString()}
            </time>
          </span>
        ),
      },
      {
        id: 'actions',
        header: t('colActions'),
        cell: (row) =>
          row.status === 'submitted' ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 [&_svg]:size-3.5"
                  aria-label={t('colActions')}
                  disabled={withdrawMutation.isPending}
                >
                  <MoreHorizontal />
                  <span className="sr-only">{t('colActions')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => withdrawMutation.mutate(row.id)}>
                  <X className="size-3.5 text-muted-foreground" />
                  {withdrawMutation.isPending ? t('withdrawing') : t('withdraw')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          ),
      },
    ],
    [t, tStatus, withdrawMutation],
  );

  return (
    <div className="space-y-3">
      {withdrawError ? (
        <p className="text-sm text-destructive" role="alert">
          {withdrawError}
        </p>
      ) : null}
      <DataTable
        data={items}
        columns={columns}
        emptyContent={t('empty')}
        getRowId={(row) => row.id}
        classNames={{ table: 'min-w-[52rem]' }}
      />
    </div>
  );
}
