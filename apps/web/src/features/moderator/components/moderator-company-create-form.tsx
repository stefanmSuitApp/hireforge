'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, type SubmitEvent } from 'react';

import { postStaffCompany } from '@/api/staff-client';
import { Button, Input, Label } from '@/components/ui';
import {
  getTranslatedApiErrorMessage,
  type ErrorsTranslator,
} from '@/lib/http/api-error-message';

import { buildLocalizedPath, type AppLocale } from '@/i18n/localized-path';

export function ModeratorCompanyCreateForm() {
  const t = useTranslations('Moderator.companies');
  const tErrors = useTranslations('Errors');
  const router = useRouter();
  const queryClient = useQueryClient();
  const locale = useLocale() as AppLocale;
  const [legalName, setLegalName] = useState('');
  const [slug, setSlug] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await postStaffCompany({
        legalName: legalName.trim(),
        slug: slug.trim().toLowerCase(),
      });
      await queryClient.invalidateQueries({
        queryKey: ['tables', 'staff', 'companies'],
      });
      router.push(buildLocalizedPath(locale, `/moderator/companies/${res.id}`));
      router.refresh();
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
      <div className="space-y-2">
        <Label htmlFor="new-legal">{t('legalName')}</Label>
        <Input
          id="new-legal"
          value={legalName}
          onChange={(e) => setLegalName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-slug">{t('slug')}</Label>
        <Input
          id="new-slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          className="font-mono"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? t('creating') : t('create')}
      </Button>
    </form>
  );
}
