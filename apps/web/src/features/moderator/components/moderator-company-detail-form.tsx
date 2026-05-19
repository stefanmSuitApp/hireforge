'use client';

import type { StaffCompanyDetailResponse } from 'contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState, type SubmitEvent } from 'react';

import { patchStaffCompany } from '@/api/staff-client';
import { Button, Checkbox, Input, Label } from '@/components/ui';
import {
  getTranslatedApiErrorMessage,
  type ErrorsTranslator,
} from '@/lib/http/api-error-message';

type Props = { company: StaffCompanyDetailResponse };

export function ModeratorCompanyDetailForm({ company }: Props) {
  const t = useTranslations('Moderator.companies');
  const tErrors = useTranslations('Errors');
  const queryClient = useQueryClient();
  const [legalName, setLegalName] = useState(company.legalName);
  const [slug, setSlug] = useState(company.slug);
  const [verified, setVerified] = useState(company.verified);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      await patchStaffCompany(company.id, {
        legalName: legalName.trim(),
        slug: slug.trim().toLowerCase(),
        verified,
      });
      await queryClient.invalidateQueries({
        queryKey: ['tables', 'staff', 'companies'],
      });
      setSaved(true);
    } catch (err) {
      setError(getTranslatedApiErrorMessage(err, tErrors as ErrorsTranslator));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="text-sm text-muted-foreground">{t('saved')}</p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="co-legal">{t('legalName')}</Label>
        <Input
          id="co-legal"
          value={legalName}
          onChange={(e) => setLegalName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="co-slug">{t('slug')}</Label>
        <Input
          id="co-slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          className="font-mono"
        />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="co-verified"
          checked={verified}
          onCheckedChange={(v) => setVerified(v === true)}
        />
        <Label htmlFor="co-verified" className="font-normal">
          {t('verified')}
        </Label>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? t('saving') : t('save')}
      </Button>
    </form>
  );
}
