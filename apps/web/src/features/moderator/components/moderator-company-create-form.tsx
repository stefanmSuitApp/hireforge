'use client';

import { companyHasIdentifier, type StaffCompanyCreateBody } from 'contracts';
import { useLocale, useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, type SubmitEvent } from 'react';

import { postStaffCompany } from '@/api/staff-client';
import { Button, Checkbox, Input, Label } from '@/components/ui';
import {
  getTranslatedApiErrorMessage,
  type ErrorsTranslator,
} from '@/lib/http/api-error-message';

import { buildLocalizedPath, type AppLocale } from '@/i18n/localized-path';

const orNull = (v: string) => v.trim() || null;

export function ModeratorCompanyCreateForm() {
  const t = useTranslations('Moderator.companies');
  const tErrors = useTranslations('Errors');
  const router = useRouter();
  const queryClient = useQueryClient();
  const locale = useLocale() as AppLocale;
  const [legalName, setLegalName] = useState('');
  const [slug, setSlug] = useState('');
  const [isForeign, setIsForeign] = useState(false);
  const [pib, setPib] = useState('');
  const [mb, setMb] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [vatId, setVatId] = useState('');
  const [taxId, setTaxId] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const body: StaffCompanyCreateBody = {
      legalName: legalName.trim(),
      slug: slug.trim().toLowerCase(),
      ...(isForeign
        ? {
            isForeign: true,
            countryCode: countryCode.trim().toUpperCase(),
            vatId: orNull(vatId),
            taxId: orNull(taxId),
            registrationNumber: orNull(registrationNumber),
          }
        : { pib: orNull(pib), mb: orNull(mb) }),
    };
    if (!companyHasIdentifier(body)) {
      setError(tErrors('COMPANY_IDENTIFIER_REQUIRED'));
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await postStaffCompany(body);
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
      <div className="flex items-center gap-2">
        <Checkbox
          id="new-foreign"
          checked={isForeign}
          onCheckedChange={(v) => setIsForeign(v === true)}
        />
        <Label htmlFor="new-foreign" className="font-normal">
          {t('foreign')}
        </Label>
      </div>
      {isForeign ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="new-country">{t('countryCode')}</Label>
            <Input
              id="new-country"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              required
              maxLength={2}
              className="font-mono uppercase"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-vat">{t('vatId')}</Label>
            <Input
              id="new-vat"
              value={vatId}
              onChange={(e) => setVatId(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-tax">{t('taxId')}</Label>
            <Input
              id="new-tax"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-reg">{t('registrationNumber')}</Label>
            <Input
              id="new-reg"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              className="font-mono"
            />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="new-pib">{t('pib')}</Label>
            <Input
              id="new-pib"
              inputMode="numeric"
              value={pib}
              onChange={(e) => setPib(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-mb">{t('mb')}</Label>
            <Input
              id="new-mb"
              inputMode="numeric"
              value={mb}
              onChange={(e) => setMb(e.target.value)}
              className="font-mono"
            />
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {isForeign ? t('identifierHintForeign') : t('identifierHint')}
      </p>
      <Button type="submit" disabled={pending}>
        {pending ? t('creating') : t('create')}
      </Button>
    </form>
  );
}
