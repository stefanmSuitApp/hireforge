'use client';

import type { StaffCompanyListItem, StaffEmployerListItem } from 'contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { patchStaffEmployer } from '@/api/staff-client';
import { Button, Label } from '@/components/ui';
import { SelectField } from '@/components/ui/select';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import {
  getTranslatedApiErrorMessage,
  type ErrorsTranslator,
} from '@/lib/http/api-error-message';
import { tableQueryKeys } from '@/hooks/queries';

type Props = {
  employers: StaffEmployerListItem[];
  companies: StaffCompanyListItem[];
};

export function ModeratorEmployersTable({ employers, companies }: Props) {
  const t = useTranslations('Moderator.employers');
  const tErrors = useTranslations('Errors');
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [companyChoice, setCompanyChoice] = React.useState<
    Record<string, string>
  >(() =>
    Object.fromEntries(employers.map((e) => [e.employerId, e.companyId])),
  );

  const companyOptions = React.useMemo(
    () =>
      companies.map((c) => ({
        value: c.id,
        label: `${c.legalName} (${c.slug})`,
      })),
    [companies],
  );

  const columns = React.useMemo<DataTableColumn<StaffEmployerListItem>[]>(
    () => [
      {
        id: 'email',
        header: t('colEmail'),
        accessorKey: 'email',
        cell: (row) => <span className="font-mono text-sm">{row.email}</span>,
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
        id: 'reassign',
        header: t('colReassign'),
        cell: (row) => (
          <div className="flex max-w-md flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-1">
              <Label
                className="text-xs text-muted-foreground"
                htmlFor={`co-${row.employerId}`}
              >
                {t('targetCompany')}
              </Label>
              <SelectField
                id={`co-${row.employerId}`}
                value={companyChoice[row.employerId] ?? row.companyId}
                onValueChange={(value) =>
                  setCompanyChoice((prev) => ({
                    ...prev,
                    [row.employerId]: value,
                  }))
                }
                options={companyOptions}
                classNames={{ trigger: 'h-9 w-full min-w-0' }}
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={
                pendingId === row.employerId ||
                (companyChoice[row.employerId] ?? row.companyId) ===
                  row.companyId
              }
              onClick={async () => {
                const next = companyChoice[row.employerId] ?? row.companyId;
                if (next === row.companyId) return;
                setPendingId(row.employerId);
                setError(null);
                try {
                  await patchStaffEmployer(row.employerId, {
                    companyId: next,
                  });
                  await queryClient.invalidateQueries({
                    queryKey: tableQueryKeys.staffEmployers(),
                  });
                } catch (err) {
                  setError(
                    getTranslatedApiErrorMessage(
                      err,
                      tErrors as ErrorsTranslator,
                    ),
                  );
                } finally {
                  setPendingId(null);
                }
              }}
            >
              {pendingId === row.employerId ? t('applying') : t('apply')}
            </Button>
          </div>
        ),
      },
    ],
    [t, companyChoice, companyOptions, pendingId, tErrors],
  );

  return (
    <div>
      {error ? (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <DataTable
        data={employers}
        columns={columns}
        emptyContent={t('empty')}
        getRowId={(row) => row.employerId}
      />
    </div>
  );
}
