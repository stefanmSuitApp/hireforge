'use client';

import type { AdminUserListItem } from 'contracts';
import { userRoles } from 'contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { patchAdminUser } from '@/api/staff-client';
import { Button, Label } from '@/components/ui';
import { SelectField } from '@/components/ui/select';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import {
  getTranslatedApiErrorMessage,
  type ErrorsTranslator,
} from '@/lib/http/api-error-message';
import { tableQueryKeys } from '@/hooks/queries';

type Props = { users: AdminUserListItem[] };

export function AdminUsersTable({ users }: Props) {
  const t = useTranslations('Admin.users');
  const tErrors = useTranslations('Errors');
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [roles, setRoles] = React.useState<
    Record<string, (typeof userRoles)[number]>
  >(() => Object.fromEntries(users.map((u) => [u.id, u.role])));

  const columns = React.useMemo<DataTableColumn<AdminUserListItem>[]>(
    () => [
      {
        id: 'email',
        header: t('colEmail'),
        accessorKey: 'email',
        cell: (row) => <span className="font-mono text-sm">{row.email}</span>,
      },
      {
        id: 'role',
        header: t('colRole'),
        cell: (row) => (
          <div className="flex max-w-xs flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-1">
              <Label className="sr-only" htmlFor={`role-${row.id}`}>
                {t('roleSelect')}
              </Label>
              <SelectField
                id={`role-${row.id}`}
                value={roles[row.id] ?? row.role}
                onValueChange={(value) =>
                  setRoles((prev) => ({
                    ...prev,
                    [row.id]: value as (typeof userRoles)[number],
                  }))
                }
                options={userRoles.map((r) => ({
                  value: r,
                  label: t(`roleLabels.${r}`),
                }))}
                classNames={{ trigger: 'h-9 w-full min-w-[8rem]' }}
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={
                pendingId === row.id || (roles[row.id] ?? row.role) === row.role
              }
              onClick={async () => {
                const next = roles[row.id] ?? row.role;
                if (next === row.role) return;
                setPendingId(row.id);
                setError(null);
                try {
                  await patchAdminUser(row.id, { role: next });
                  await queryClient.invalidateQueries({
                    queryKey: tableQueryKeys.adminUsers(),
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
              {pendingId === row.id ? t('saving') : t('save')}
            </Button>
          </div>
        ),
      },
    ],
    [t, roles, pendingId, tErrors],
  );

  return (
    <div>
      {error ? (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <DataTable
        data={users}
        columns={columns}
        emptyContent={t('empty')}
        getRowId={(row) => row.id}
      />
    </div>
  );
}
