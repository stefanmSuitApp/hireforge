'use client';

import type { StaffCompanyDetailResponse } from 'contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  postStaffCompanyCloseLost,
  postStaffCompanyCloseWon,
  postStaffCompanyPickup,
} from '@/api/staff-client';
import {
  staffSalesStatusTone,
  TableStatusBadge,
} from '@/components/table-status-badge';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui';
import {
  getTranslatedApiErrorMessage,
  type ErrorsTranslator,
} from '@/lib/http/api-error-message';

type Props = {
  company: StaffCompanyDetailResponse;
  currentUserId: string;
};

export function ModeratorCompanySalesActions({
  company,
  currentUserId,
}: Props) {
  const t = useTranslations('Moderator.companies');
  const tErrors = useTranslations('Errors');
  const router = useRouter();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [lostNote, setLostNote] = useState('');
  const [showLostNote, setShowLostNote] = useState(false);

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ['tables', 'staff', 'companies'] });

  const afterSalesMutation = async () => {
    await invalidate();
    router.refresh();
  };

  const pickupMu = useMutation({
    mutationFn: () => postStaffCompanyPickup(company.id),
    onSuccess: async () => {
      setError(null);
      await afterSalesMutation();
    },
    onError: (err) => {
      setError(getTranslatedApiErrorMessage(err, tErrors as ErrorsTranslator));
    },
  });

  const wonMu = useMutation({
    mutationFn: () => postStaffCompanyCloseWon(company.id),
    onSuccess: async () => {
      setError(null);
      await afterSalesMutation();
    },
    onError: (err) => {
      setError(getTranslatedApiErrorMessage(err, tErrors as ErrorsTranslator));
    },
  });

  const lostMu = useMutation({
    mutationFn: () =>
      postStaffCompanyCloseLost(company.id, {
        note: lostNote.trim() || undefined,
      }),
    onSuccess: async () => {
      setError(null);
      setShowLostNote(false);
      setLostNote('');
      await afterSalesMutation();
    },
    onError: (err) => {
      setError(getTranslatedApiErrorMessage(err, tErrors as ErrorsTranslator));
    },
  });

  const inPool =
    company.salesStatus === 'unassigned' ||
    company.salesStatus === 'closed_lost';
  const isOwner = company.assignedModeratorId === currentUserId;
  const inPipeline = company.salesStatus === 'pipeline';

  const canPickup = inPool;
  const canCloseWon = inPipeline && isOwner;
  const canCloseLost = inPipeline && isOwner;

  return (
    <section className="space-y-4 rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {t('salesHeading')}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('salesLead')}
          </p>
        </div>
        <TableStatusBadge
          label={t(`salesStatus.${company.salesStatus ?? 'unassigned'}`)}
          tone={staffSalesStatusTone(company.salesStatus ?? 'unassigned')}
        />
      </div>
      {company.assignedModeratorEmail ? (
        <p className="text-xs text-muted-foreground font-mono">
          {t('assignedModerator')}: {company.assignedModeratorEmail}
        </p>
      ) : company.assignedModeratorId ? (
        <p className="text-xs text-muted-foreground font-mono">
          {t('assignedModeratorId')}: {company.assignedModeratorId}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {canPickup || canCloseWon || canCloseLost ? (
        <div className="flex flex-wrap gap-2">
          {canPickup ? (
            <Button
              type="button"
              size="sm"
              disabled={pickupMu.isPending}
              onClick={() => pickupMu.mutate()}
            >
              {pickupMu.isPending ? t('pickupPending') : t('pickup')}
            </Button>
          ) : null}
          {canCloseWon ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={wonMu.isPending}
              onClick={() => {
                if (
                  typeof window !== 'undefined' &&
                  window.confirm(t('confirmCloseWon'))
                ) {
                  wonMu.mutate();
                }
              }}
            >
              {wonMu.isPending ? t('closeWonPending') : t('closeWon')}
            </Button>
          ) : null}
          {canCloseLost ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={lostMu.isPending}
              onClick={() => setShowLostNote((v) => !v)}
            >
              {t('closeLost')}
            </Button>
          ) : null}
        </div>
      ) : null}
      {showLostNote && canCloseLost ? (
        <div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-4">
          <Label htmlFor="lost-note">{t('closeLostNote')}</Label>
          <Input
            id="lost-note"
            value={lostNote}
            onChange={(e) => setLostNote(e.target.value)}
            placeholder={t('closeLostNotePlaceholder')}
          />
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={lostMu.isPending}
            onClick={() => {
              if (
                typeof window !== 'undefined' &&
                window.confirm(t('confirmCloseLost'))
              ) {
                lostMu.mutate();
              }
            }}
          >
            {lostMu.isPending
              ? t('closeLostPending')
              : t('confirmCloseLostSubmit')}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
