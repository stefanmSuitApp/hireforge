'use client';

import type { StaffCompanyCreateBody } from 'contracts';
import { useTranslations } from 'next-intl';

import { Checkbox, Input, Label } from '@/components/ui';

export type CompanyIdentifiers = {
  isForeign: boolean;
  countryCode: string;
  pib: string;
  mb: string;
  vatId: string;
  taxId: string;
  registrationNumber: string;
};

export function companyIdentifiersFrom(company?: {
  isForeign?: boolean;
  countryCode?: string;
  pib?: string | null;
  mb?: string | null;
  vatId?: string | null;
  taxId?: string | null;
  registrationNumber?: string | null;
}): CompanyIdentifiers {
  const isForeign = company?.isForeign ?? false;
  return {
    isForeign,
    countryCode: isForeign ? (company?.countryCode ?? '') : '',
    pib: company?.pib ?? '',
    mb: company?.mb ?? '',
    vatId: company?.vatId ?? '',
    taxId: company?.taxId ?? '',
    registrationNumber: company?.registrationNumber ?? '',
  };
}

const orNull = (v: string) => v.trim() || null;

/** The body fields for create / patch; empty inputs clear the value. */
export function companyIdentifiersBody(
  v: CompanyIdentifiers,
): Partial<StaffCompanyCreateBody> {
  return v.isForeign
    ? {
        isForeign: true,
        countryCode: v.countryCode.trim().toUpperCase(),
        vatId: orNull(v.vatId),
        taxId: orNull(v.taxId),
        registrationNumber: orNull(v.registrationNumber),
      }
    : {
        isForeign: false,
        countryCode: 'RS',
        pib: orNull(v.pib),
        mb: orNull(v.mb),
      };
}

/**
 * PIB / MB, or the foreign identifiers. All optional: without them the
 * self-signup matches by name and the company fills them in.
 */
export function CompanyIdentifierFields({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string;
  value: CompanyIdentifiers;
  onChange: (next: CompanyIdentifiers) => void;
}) {
  const t = useTranslations('Moderator.companies');
  const set = (key: keyof CompanyIdentifiers) => (v: string) =>
    onChange({ ...value, [key]: v });
  const field = (
    key: Exclude<keyof CompanyIdentifiers, 'isForeign'>,
    label: string,
    props: React.ComponentProps<typeof Input> = {},
  ) => (
    <div className="space-y-2">
      <Label htmlFor={`${idPrefix}-${key}`}>{label}</Label>
      <Input
        id={`${idPrefix}-${key}`}
        value={value[key]}
        onChange={(e) => set(key)(e.target.value)}
        className="font-mono"
        {...props}
      />
    </div>
  );

  return (
    <>
      <div className="flex items-center gap-2">
        <Checkbox
          id={`${idPrefix}-foreign`}
          checked={value.isForeign}
          onCheckedChange={(v) => onChange({ ...value, isForeign: v === true })}
        />
        <Label htmlFor={`${idPrefix}-foreign`} className="font-normal">
          {t('foreign')}
        </Label>
      </div>
      {value.isForeign ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {field('countryCode', t('countryCode'), {
            required: true,
            maxLength: 2,
            className: 'font-mono uppercase',
          })}
          {field('vatId', t('vatId'))}
          {field('taxId', t('taxId'))}
          {field('registrationNumber', t('registrationNumber'))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {field('pib', t('pib'), { inputMode: 'numeric' })}
          {field('mb', t('mb'), { inputMode: 'numeric' })}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {value.isForeign ? t('identifierHintForeign') : t('identifierHint')}
      </p>
    </>
  );
}
