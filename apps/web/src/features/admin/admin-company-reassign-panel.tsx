'use client';

import type { AdminCompanyAssignmentHistoryResponse } from 'contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState, type SubmitEvent } from 'react';

import {
  getAdminCompanyAssignmentHistory,
  getAdminUserList,
  postAdminCompanyReassign,
} from '@/api/staff-client';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui';
import { SelectField } from '@/components/ui/select';
import {
  getTranslatedApiErrorMessage,
  type ErrorsTranslator,
} from '@/lib/http/api-error-message';

const MODERATOR_NONE = '__hf_moderator_none__';

type Props = {
  companyId: string;
  initialHistory: AdminCompanyAssignmentHistoryResponse;
};

export function AdminCompanyReassignPanel({
  companyId,
  initialHistory,
}: Props) {
  const t = useTranslations('Admin.companies');
  const tErrors = useTranslations('Errors');
  const router = useRouter();
  const qc = useQueryClient();
  const [targetUserId, setTargetUserId] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const historyQuery = useQuery({
    queryKey: ['admin', 'company-history', companyId],
    queryFn: () => getAdminCompanyAssignmentHistory(companyId),
    initialData: initialHistory,
    staleTime: Number.POSITIVE_INFINITY,
  });

  const moderatorsQuery = useQuery({
    queryKey: ['admin', 'moderators-pick'],
    queryFn: () => getAdminUserList('role=moderator&limit=100&offset=0'),
  });

  const reassign = useMutation({
    mutationFn: () =>
      postAdminCompanyReassign(companyId, {
        toUserId: targetUserId,
        reason: reason.trim(),
      }),
    onSuccess: async () => {
      setFormError(null);
      setReason('');
      setTargetUserId('');
      await qc.invalidateQueries({
        queryKey: ['admin', 'company-history', companyId],
      });
      await qc.invalidateQueries({
        queryKey: ['tables', 'staff', 'companies'],
      });
      router.refresh();
    },
    onError: (err) => {
      setFormError(
        getTranslatedApiErrorMessage(err, tErrors as ErrorsTranslator),
      );
    },
  });

  function onSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!targetUserId || !reason.trim()) {
      setFormError(tErrors('VALIDATION_FAILED'));
      return;
    }
    reassign.mutate();
  }

  const items = historyQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-background p-5">
        <h3 className="text-base font-semibold text-foreground">
          {t('historyHeading')}
        </h3>
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {t('historyEmpty')}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-border/70">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="px-3 py-2 font-medium">{t('colWhen')}</th>
                  <th className="px-3 py-2 font-medium">{t('colFrom')}</th>
                  <th className="px-3 py-2 font-medium">{t('colTo')}</th>
                  <th className="px-3 py-2 font-medium">{t('colBy')}</th>
                  <th className="px-3 py-2 font-medium">{t('colReason')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {row.fromUserEmail ?? row.fromUserId ?? '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {row.toUserEmail ?? row.toUserId ?? '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {row.changedByAdminEmail}
                    </td>
                    <td className="max-w-xs px-3 py-2 text-xs">{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border/70 bg-background p-5">
        <h3 className="text-base font-semibold text-foreground">
          {t('reassignHeading')}
        </h3>
        <form onSubmit={onSubmit} className="mt-4 max-w-xl space-y-4">
          {formError ? (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="mod-target">{t('reassignTarget')}</Label>
            <SelectField
              id="mod-target"
              disabled={moderatorsQuery.isLoading}
              options={[
                { value: MODERATOR_NONE, label: '—' },
                ...(moderatorsQuery.data?.items ?? []).map((u) => ({
                  value: u.id,
                  label: u.email,
                })),
              ]}
              value={targetUserId || MODERATOR_NONE}
              onValueChange={(v) =>
                setTargetUserId(v === MODERATOR_NONE ? '' : v)
              }
              placeholder={t('reassignTarget')}
              classNames={{ trigger: 'h-9 w-full font-normal' }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mod-reason">{t('reassignReason')}</Label>
            <Input
              id="mod-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('reassignReasonPlaceholder')}
              required
            />
          </div>
          <Button type="submit" disabled={reassign.isPending}>
            {reassign.isPending ? t('reassignPending') : t('reassignSubmit')}
          </Button>
        </form>
      </section>
    </div>
  );
}
