'use client';

import type {
  EmployerApplicationStatusTarget,
  EmployerJobApplicationItem,
} from 'contracts';
import { employerApplicationNextStatuses } from 'contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import * as React from 'react';

import {
  employerApplicationCvUrl,
  patchEmployerApplicationStatus,
} from '@/api/employer-jobs';
import {
  applicationPipelineStatusTone,
  TableStatusBadge,
} from '@/components/table-status-badge';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { employerTableQueryPrefix } from '@/hooks/queries/table-query-keys';
import {
  getTranslatedApiErrorMessage,
  type ErrorsTranslator,
} from '@/lib/http/api-error-message';

type Props = { items: EmployerJobApplicationItem[] };

type Row = EmployerJobApplicationItem;
type Decision = 'shortlisted' | 'rejected' | 'hired';
type StatusKey =
  | 'submitted'
  | 'viewed'
  | 'shortlisted'
  | 'withdrawn'
  | 'reviewed'
  | 'rejected'
  | 'hired';

const DECISION_LABEL = {
  shortlisted: 'shortlist',
  hired: 'hire',
  rejected: 'reject',
} as const;

export function EmployerJobApplicationsTable({ items }: Props) {
  const t = useTranslations('Employer.applications');
  const format = useFormatter();
  const tStatus = useTranslations('Employer.applicationStatus');
  const tErrors = useTranslations('Errors');
  const tCommon = useTranslations('Common');
  const queryClient = useQueryClient();
  const [confirmDialog, confirm] = useConfirm();
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(
    () => queryClient.invalidateQueries({ queryKey: employerTableQueryPrefix }),
    [queryClient],
  );

  const decide = useMutation({
    mutationFn: (v: { id: string; status: EmployerApplicationStatusTarget }) =>
      patchEmployerApplicationStatus(v.id, v.status),
    onMutate: () => setError(null),
    onSuccess: refresh,
    onError: async (err) => {
      setError(getTranslatedApiErrorMessage(err, tErrors as ErrorsTranslator));
      await refresh();
    },
  });

  const onDecision = React.useCallback(
    async (row: Row, status: Decision) => {
      // Rejecting and hiring are final and the candidate sees them.
      if (status !== 'shortlisted') {
        const kind = status === 'hired' ? 'hire' : 'reject';
        const ok = await confirm({
          title: t(`${kind}ConfirmTitle`),
          description: t(`${kind}ConfirmBody`, {
            name: row.candidateName ?? row.candidateEmail,
          }),
          confirmLabel: t(`${kind}ConfirmAction`),
          cancelLabel: tCommon('cancel'),
          destructive: status === 'rejected',
        });
        if (!ok) return;
      }
      decide.mutate({ id: row.id, status });
    },
    [confirm, decide, t, tCommon],
  );

  const cells = React.useMemo(
    () => ({
      candidate: (row: Row) => (
        <div className="min-w-0">
          {row.candidateName ? (
            <p className="font-medium text-foreground">{row.candidateName}</p>
          ) : null}
          <a
            href={`mailto:${row.candidateEmail}`}
            className="break-all font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            {row.candidateEmail}
          </a>
        </div>
      ),
      status: (row: Row) => (
        <TableStatusBadge
          label={tStatus(row.status as StatusKey)}
          tone={applicationPipelineStatusTone(row.status)}
        />
      ),
      resume: (row: Row) =>
        row.resumeOriginalFilename ? (
          <a
            href={employerApplicationCvUrl(row.id)}
            download
            title={row.resumeOriginalFilename}
            // Opening the CV marks the application viewed on the server.
            onClick={() => window.setTimeout(() => void refresh(), 1500)}
            className="inline-flex items-center gap-1.5 text-primary underline-offset-2 hover:underline"
          >
            <Download className="size-3.5" aria-hidden />
            {t('downloadCv')}
          </a>
        ) : (
          '—'
        ),
      // Up to 1500 characters: collapsed so the list stays scannable.
      coverLetter: (row: Row) =>
        row.coverLetterText ? (
          <details className="max-w-md">
            <summary className="cursor-pointer text-primary underline-offset-2 hover:underline">
              {t('readCoverLetter')}
            </summary>
            <p className="mt-2 whitespace-pre-line text-foreground">
              {row.coverLetterText}
            </p>
          </details>
        ) : (
          '—'
        ),
      applied: (row: Row) => (
        <span className="text-muted-foreground">
          <time dateTime={row.createdAt}>
            {format.dateTime(new Date(row.createdAt), {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </time>
        </span>
      ),
      actions: (row: Row) => {
        const next = employerApplicationNextStatuses(row.status);
        if (next.length === 0) {
          return <span className="text-sm text-muted-foreground">—</span>;
        }
        return (
          <div className="flex flex-wrap gap-2">
            {next.map((status) => (
              <Button
                key={status}
                type="button"
                size="sm"
                variant={status === 'rejected' ? 'outline' : 'default'}
                disabled={decide.isPending}
                onClick={() => void onDecision(row, status)}
              >
                {t(DECISION_LABEL[status])}
              </Button>
            ))}
          </div>
        );
      },
    }),
    [t, tStatus, format, refresh, decide.isPending, onDecision],
  );

  const columns = React.useMemo<DataTableColumn<Row>[]>(
    () => [
      {
        id: 'candidate',
        header: t('colCandidate'),
        accessorKey: 'candidateEmail',
        cell: cells.candidate,
      },
      { id: 'status', header: t('colStatus'), cell: cells.status },
      { id: 'resume', header: t('colResume'), cell: cells.resume },
      {
        id: 'coverLetter',
        header: t('colCoverLetter'),
        cell: cells.coverLetter,
      },
      {
        id: 'applied',
        header: t('colApplied'),
        accessorKey: 'createdAt',
        cell: cells.applied,
      },
      { id: 'actions', header: t('colActions'), cell: cells.actions },
    ],
    [t, cells],
  );

  return (
    <div className="space-y-3">
      {confirmDialog}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {/* Phones get cards: a six-column table hides the CV and the buttons. */}
      <ul className="space-y-3 md:hidden">
        {items.map((row) => (
          <li
            key={row.id}
            className="space-y-3 rounded-xl border border-border/70 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              {cells.candidate(row)}
              {cells.status(row)}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              {cells.resume(row)}
              {cells.applied(row)}
            </div>
            {row.coverLetterText ? (
              <div className="text-sm">{cells.coverLetter(row)}</div>
            ) : null}
            {cells.actions(row)}
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <DataTable
          data={items}
          columns={columns}
          emptyContent={t('empty')}
          getRowId={(row) => row.id}
          classNames={{
            root: 'border-0 rounded-none',
            table: 'min-w-[48rem]',
            cell: 'py-3 align-top',
          }}
        />
      </div>
    </div>
  );
}
