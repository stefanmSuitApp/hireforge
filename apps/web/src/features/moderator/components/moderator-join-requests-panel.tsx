'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import {
  getStaffJoinRequests,
  postStaffJoinRequestDecision,
} from '@/api/staff-client';
import { Button } from '@/components/ui/button';
import {
  getTranslatedApiErrorMessage,
  type ErrorsTranslator,
} from '@/lib/http/api-error-message';

const QUERY_KEY = ['tables', 'staff', 'company-join-requests'] as const;

/** Employer signups that matched an existing company; hidden when the queue is empty. */
export function ModeratorJoinRequestsPanel() {
  const t = useTranslations('Moderator.joinRequests');
  const tErrors = useTranslations('Errors');
  const qc = useQueryClient();
  const [error, setError] = React.useState<string | null>(null);

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: getStaffJoinRequests,
  });

  const decide = useMutation({
    mutationFn: (input: { id: string; decision: 'approve' | 'reject' }) =>
      postStaffJoinRequestDecision(input.id, input.decision),
    onSuccess: async () => {
      setError(null);
      await qc.invalidateQueries({ queryKey: QUERY_KEY });
      await qc.invalidateQueries({
        queryKey: ['tables', 'staff', 'companies'],
      });
    },
    onError: (err) => {
      setError(getTranslatedApiErrorMessage(err, tErrors as ErrorsTranslator));
    },
  });

  const items = query.data?.items ?? [];
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-warning/30 bg-warning-soft p-5 shadow-sm">
      <h2 className="text-base font-semibold text-foreground">
        {t('heading')}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t('lead')}</p>
      <p className="mt-1 text-xs text-muted-foreground">{t('fillNote')}</p>
      {error ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="mt-4 flex flex-col gap-3">
        {items.map((item) => (
          <li
            key={item.id}
            data-testid="join-request-row"
            className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="text-sm">
              <p className="m-0 font-medium text-foreground">
                {item.userEmail}
              </p>
              <p className="m-0 text-muted-foreground">
                {t('wantsToJoin', { company: item.companyLegalName })}
                {item.companyPib ? ` · PIB ${item.companyPib}` : null}
              </p>
              {item.submitted ? (
                <p className="m-0 text-xs text-muted-foreground">
                  {t('submitted', {
                    details: [
                      item.submitted.legalName,
                      item.submitted.pib && `PIB ${item.submitted.pib}`,
                      item.submitted.mb && `MB ${item.submitted.mb}`,
                      item.submitted.vatId && `VAT ${item.submitted.vatId}`,
                      item.submitted.taxId && `Tax ID ${item.submitted.taxId}`,
                    ]
                      .filter(Boolean)
                      .join(' · '),
                  })}
                </p>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                disabled={decide.isPending}
                onClick={() =>
                  decide.mutate({ id: item.id, decision: 'approve' })
                }
              >
                {t('approve')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={decide.isPending}
                onClick={() =>
                  decide.mutate({ id: item.id, decision: 'reject' })
                }
              >
                {t('reject')}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
