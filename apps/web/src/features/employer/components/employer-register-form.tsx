'use client';

import {
  employerSelfSignupBodySchema,
  isEUCountry,
  type EmployerSelfSignupBody,
} from 'contracts';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type SubmitEvent } from 'react';

import { Button, Input, Label, PasswordInput } from '@/components/ui';
import { FieldError, fieldErrorProps } from '@/components/ui/field-error';
import { SelectField } from '@/components/ui/select';
import { SignUpLegalNotice } from '@/features/legal/legal-links';
import { useEmployerRegisterMutation } from '@/hooks/mutations';
import {
  getTranslatedApiErrorMessage,
  type ErrorsTranslator,
} from '@/lib/http/api-error-message';

const DRAFT_KEY = 'hireforge-employer-register-draft-v1';
const COUNTRY_CODES = [
  'RS',
  'DE',
  'FR',
  'US',
  'AT',
  'NL',
  'HR',
  'SI',
  'GB',
] as const;

type DraftFields = {
  step: number;
  email: string;
  countryCode: string;
  legalName: string;
  companySlug: string;
  pib: string;
  mb: string;
  vatId: string;
  taxId: string;
  registrationNumber: string;
  addressLine1: string;
  addressLine2: string;
  addressPostalCode: string;
  addressCity: string;
  addressStateRegion: string;
  bankName: string;
  iban: string;
  swiftBic: string;
  bankCountryCode: string;
  accountCurrency: string;
  invoiceLanguage: string;
  billingEmail: string;
  billingPhone: string;
  billingContactName: string;
  responsiblePerson: string;
  responsiblePosition: string;
};

function emptyDraft(): DraftFields {
  return {
    step: 0,
    email: '',
    countryCode: 'RS',
    legalName: '',
    companySlug: '',
    pib: '',
    mb: '',
    vatId: '',
    taxId: '',
    registrationNumber: '',
    addressLine1: '',
    addressLine2: '',
    addressPostalCode: '',
    addressCity: '',
    addressStateRegion: '',
    bankName: '',
    iban: '',
    swiftBic: '',
    bankCountryCode: 'RS',
    accountCurrency: 'RSD',
    invoiceLanguage: 'sr',
    billingEmail: '',
    billingPhone: '',
    billingContactName: '',
    responsiblePerson: '',
    responsiblePosition: '',
  };
}

function buildSignupBody(
  d: DraftFields,
  password: string,
): EmployerSelfSignupBody {
  const companySlug = d.companySlug.trim() || undefined;
  if (d.countryCode === 'RS') {
    return {
      email: d.email.trim(),
      password,
      companySlug,
      company: {
        isForeign: false,
        countryCode: 'RS',
        legalName: d.legalName.trim(),
        pib: d.pib.trim(),
        mb: d.mb.trim(),
        addressLine1: d.addressLine1.trim(),
        addressPostalCode: d.addressPostalCode.trim(),
        addressCity: d.addressCity.trim(),
        billingEmail: d.billingEmail.trim(),
        billingContactName: d.billingContactName.trim(),
        invoiceCurrency: 'RSD',
        invoiceLanguage: 'sr',
        vatTreatment: 'rs_standard_20',
        addressLine2: d.addressLine2.trim() || undefined,
        addressStateRegion: d.addressStateRegion.trim() || undefined,
        bankName: d.bankName.trim() || undefined,
        iban: d.iban.trim().toUpperCase() || undefined,
        swiftBic: d.swiftBic.trim().toUpperCase() || undefined,
        bankCountryCode: d.bankCountryCode.trim().toUpperCase() || undefined,
        accountCurrency: d.accountCurrency.trim().toUpperCase() || undefined,
        billingPhone: d.billingPhone.trim() || undefined,
        responsiblePerson:
          d.responsiblePerson.trim() ||
          d.billingContactName.trim() ||
          undefined,
        responsiblePosition: d.responsiblePosition.trim() || undefined,
        registrationNumber: d.registrationNumber.trim() || undefined,
      },
    };
  }
  const eu = isEUCountry(d.countryCode);
  const vat = d.vatId.trim().toUpperCase();
  const tax = d.taxId.trim();
  return {
    email: d.email.trim(),
    password,
    companySlug,
    company: {
      isForeign: true,
      countryCode: d.countryCode,
      legalName: d.legalName.trim(),
      vatId: eu ? vat : undefined,
      taxId: eu ? undefined : tax,
      addressLine1: d.addressLine1.trim(),
      addressPostalCode: d.addressPostalCode.trim(),
      addressCity: d.addressCity.trim(),
      bankName: d.bankName.trim(),
      iban: d.iban.trim().toUpperCase(),
      swiftBic: d.swiftBic.trim().toUpperCase(),
      bankCountryCode: d.bankCountryCode.trim().toUpperCase(),
      accountCurrency: d.accountCurrency.trim().toUpperCase(),
      invoiceCurrency: d.accountCurrency.trim().toUpperCase(),
      invoiceLanguage: d.invoiceLanguage === 'en' ? 'en' : 'sr',
      vatTreatment: eu ? 'rs_reverse_charge' : 'rs_export_no_vat',
      billingEmail: d.billingEmail.trim(),
      billingContactName: d.billingContactName.trim(),
      addressLine2: d.addressLine2.trim() || undefined,
      addressStateRegion: d.addressStateRegion.trim() || undefined,
      billingPhone: d.billingPhone.trim() || undefined,
      responsiblePerson: d.responsiblePerson.trim() || undefined,
      responsiblePosition: d.responsiblePosition.trim() || undefined,
      registrationNumber: d.registrationNumber.trim() || undefined,
      pib: d.pib.trim() || undefined,
      mb: d.mb.trim() || undefined,
    },
  };
}

function readDraft(): DraftFields | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DraftFields>;
    return {
      ...emptyDraft(),
      ...parsed,
      step: Math.min(Math.max(parsed.step ?? 0, 0), 2),
    };
  } catch {
    return null;
  }
}

export function EmployerRegisterForm() {
  const t = useTranslations('Employer');
  const tReg = useTranslations('Employer.register');
  const locale = useLocale();
  const tErrors = useTranslations('Errors');
  const register = useEmployerRegisterMutation();
  const draftReady = useRef(false);
  const [draft, setDraft] = useState<DraftFields>(emptyDraft);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const saved = readDraft();
    if (saved) {
      setDraft(saved);
      setClientError(tReg('draftRestored'));
    }
    draftReady.current = true;
  }, [tReg]);

  useEffect(() => {
    if (!draftReady.current) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  const isDomestic = draft.countryCode === 'RS';

  function applyCountryDefaults(code: string) {
    setDraft((d) => {
      if (code === 'RS') {
        return {
          ...d,
          countryCode: code,
          accountCurrency: 'RSD',
          invoiceLanguage: 'sr',
          bankCountryCode: 'RS',
        };
      }
      return {
        ...d,
        countryCode: code,
        accountCurrency: code === 'US' ? 'USD' : 'EUR',
        invoiceLanguage: 'en',
        bankCountryCode: code,
      };
    });
  }

  // Domestic companies: account + company (2 steps). Foreign ones also need
  // bank details for international invoices (3 steps).
  const steps = isDomestic
    ? [tReg('stepAccount'), tReg('stepCompany')]
    : [tReg('stepAccount'), tReg('stepCompany'), tReg('stepBilling')];
  const lastStep = steps.length - 1;

  /** Errors per field id for a step; empty when the step is valid. */
  function stepErrors(step: number): Record<string, string> {
    const errors: Record<string, string> = {};
    const required = (id: string, value: string) => {
      if (!value.trim()) errors[id] = tReg('fieldRequired');
    };
    if (step === 0) {
      required('reg-name', draft.billingContactName);
      if (!draft.email.includes('@')) errors['reg-email'] = tReg('fieldEmail');
      if (password.length < 8) errors['reg-password'] = tReg('fieldPassword');
    }
    if (step === 1) {
      required('reg-legal', draft.legalName);
      if (isDomestic) {
        required('reg-pib', draft.pib);
        required('reg-mb', draft.mb);
      } else if (isEUCountry(draft.countryCode)) {
        required('reg-vat', draft.vatId);
      } else {
        required('reg-tax', draft.taxId);
      }
    }
    if (step === 1) {
      required('reg-a1', draft.addressLine1);
      required('reg-zip', draft.addressPostalCode);
      required('reg-city', draft.addressCity);
      if (isDomestic && !draft.billingEmail.includes('@')) {
        errors['reg-bille'] = tReg('fieldEmail');
      }
    }
    if (step === 2) {
      required('reg-bille', draft.billingEmail);
      required('reg-billn', draft.billingContactName);
      if (!isDomestic) {
        required('reg-bank', draft.bankName);
        required('reg-iban', draft.iban);
        required('reg-swift', draft.swiftBic);
        required('reg-bcc', draft.bankCountryCode);
      }
    }
    return errors;
  }

  function validateStep(step: number): boolean {
    setClientError(null);
    const errors = stepErrors(step);
    setFieldErrors(errors);
    const first = Object.keys(errors)[0];
    if (!first) return true;
    setClientError(tReg('validationFailed'));
    // Take the user to the first field to fix.
    requestAnimationFrame(() => document.getElementById(first)?.focus());
    return false;
  }

  function goNext() {
    if (!validateStep(draft.step)) return;
    setDraft((d) => ({
      ...d,
      // Invoices go to the account email unless changed.
      billingEmail: d.billingEmail || d.email.trim(),
      step: Math.min(d.step + 1, lastStep),
    }));
  }

  function goBack() {
    setClientError(null);
    setFieldErrors({});
    setDraft((d) => ({ ...d, step: Math.max(d.step - 1, 0) }));
  }

  function onSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (draft.step < lastStep) {
      goNext();
      return;
    }
    if (!validateStep(lastStep)) return;
    setError(null);
    const body = {
      ...buildSignupBody(draft, password),
      locale: locale === 'en' ? ('en' as const) : ('sr' as const),
    };
    const parsed = employerSelfSignupBodySchema.safeParse(body);
    if (!parsed.success) {
      setError(tReg('validationFailed'));
      return;
    }
    register.mutate(parsed.data, {
      onSuccess: () => {
        localStorage.removeItem(DRAFT_KEY);
      },
      onError: (err) => {
        setError(
          getTranslatedApiErrorMessage(err, tErrors as ErrorsTranslator),
        );
      },
    });
  }

  return (
    <form
      method="post"
      onSubmit={onSubmit}
      className="flex flex-col gap-5 [&_input]:h-11 [&_input]:rounded-xl"
    >
      <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
        {steps.map((label, i) => (
          <span
            key={label}
            className={
              i === draft.step
                ? 'rounded-md bg-primary/10 px-2 py-0.5 font-medium text-primary'
                : 'px-2 py-0.5'
            }
          >
            {i + 1}. {label}
          </span>
        ))}
      </div>

      {draft.step === 0 ? (
        <>
          <div className="space-y-2">
            <Label
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              htmlFor="reg-name"
            >
              {tReg('yourName')}
            </Label>
            <Input
              id="reg-name"
              {...fieldErrorProps('reg-name', fieldErrors['reg-name'])}
              name="name"
              autoComplete="name"
              required
              value={draft.billingContactName}
              onChange={(e) =>
                setDraft((d) => ({ ...d, billingContactName: e.target.value }))
              }
            />
            <FieldError id="reg-name" message={fieldErrors['reg-name']} />
          </div>
          <div className="space-y-2">
            <Label
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              htmlFor="reg-email"
            >
              {t('email')}
            </Label>
            <Input
              id="reg-email"
              {...fieldErrorProps('reg-email', fieldErrors['reg-email'])}
              name="email"
              type="email"
              autoComplete="email"
              required
              value={draft.email}
              onChange={(e) =>
                setDraft((d) => ({ ...d, email: e.target.value }))
              }
            />
            <FieldError id="reg-email" message={fieldErrors['reg-email']} />
          </div>
          <div className="space-y-2">
            <Label
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              htmlFor="reg-password"
            >
              {t('password')}
            </Label>
            <PasswordInput
              id="reg-password"
              {...fieldErrorProps('reg-password', fieldErrors['reg-password'])}
              name="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              showLabel={t('passwordShow')}
              hideLabel={t('passwordHide')}
              className="h-11 rounded-xl"
            />
            <FieldError
              id="reg-password"
              message={fieldErrors['reg-password']}
            />
            <p className="text-xs text-muted-foreground">{t('passwordHint')}</p>
          </div>
        </>
      ) : null}

      {draft.step === 1 ? (
        <>
          <div className="space-y-2">
            <Label
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              htmlFor="reg-country"
            >
              {tReg('country')}
            </Label>
            <SelectField
              id="reg-country"
              options={COUNTRY_CODES.map((code) => ({
                value: code,
                label: code,
              }))}
              value={draft.countryCode}
              onValueChange={(v) => applyCountryDefaults(v)}
              classNames={{
                trigger: 'h-11 w-full rounded-xl font-normal',
              }}
            />
          </div>
          <div className="space-y-2">
            <Label
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              htmlFor="reg-legal"
            >
              {t('legalName')}
            </Label>
            <Input
              id="reg-legal"
              {...fieldErrorProps('reg-legal', fieldErrors['reg-legal'])}
              value={draft.legalName}
              onChange={(e) =>
                setDraft((d) => ({ ...d, legalName: e.target.value }))
              }
              required
            />
            <FieldError id="reg-legal" message={fieldErrors['reg-legal']} />
          </div>
          <div className="space-y-2">
            <Label
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              htmlFor="reg-slug"
            >
              {t('companySlug')}
            </Label>
            <Input
              id="reg-slug"
              value={draft.companySlug}
              onChange={(e) =>
                setDraft((d) => ({ ...d, companySlug: e.target.value }))
              }
              placeholder={t('companySlugPlaceholder')}
            />
            <p className="text-xs text-muted-foreground">
              {t('companySlugHint')}
            </p>
          </div>
          {isDomestic ? (
            <>
              <div className="space-y-2">
                <Label
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  htmlFor="reg-pib"
                >
                  {tReg('pib')}
                </Label>
                <Input
                  id="reg-pib"
                  {...fieldErrorProps('reg-pib', fieldErrors['reg-pib'])}
                  inputMode="numeric"
                  value={draft.pib}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, pib: e.target.value }))
                  }
                  required
                />
                <FieldError id="reg-pib" message={fieldErrors['reg-pib']} />
              </div>
              <div className="space-y-2">
                <Label
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  htmlFor="reg-mb"
                >
                  {tReg('mb')}
                </Label>
                <Input
                  id="reg-mb"
                  {...fieldErrorProps('reg-mb', fieldErrors['reg-mb'])}
                  inputMode="numeric"
                  value={draft.mb}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, mb: e.target.value }))
                  }
                  required
                />
                <FieldError id="reg-mb" message={fieldErrors['reg-mb']} />
              </div>
            </>
          ) : isEUCountry(draft.countryCode) ? (
            <div className="space-y-2">
              <Label
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                htmlFor="reg-vat"
              >
                {tReg('vatId')}
              </Label>
              <Input
                id="reg-vat"
                {...fieldErrorProps('reg-vat', fieldErrors['reg-vat'])}
                value={draft.vatId}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    vatId: e.target.value.toUpperCase(),
                  }))
                }
                required
              />
              <FieldError id="reg-vat" message={fieldErrors['reg-vat']} />
            </div>
          ) : (
            <div className="space-y-2">
              <Label
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                htmlFor="reg-tax"
              >
                {tReg('taxId')}
              </Label>
              <Input
                id="reg-tax"
                {...fieldErrorProps('reg-tax', fieldErrors['reg-tax'])}
                value={draft.taxId}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, taxId: e.target.value }))
                }
                required
              />
              <FieldError id="reg-tax" message={fieldErrors['reg-tax']} />
            </div>
          )}
          <div className="space-y-2">
            <Label
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              htmlFor="reg-regno"
            >
              {tReg('registrationNumber')}
            </Label>
            <Input
              id="reg-regno"
              value={draft.registrationNumber}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  registrationNumber: e.target.value,
                }))
              }
            />
          </div>
        </>
      ) : null}

      {draft.step === 1 ? (
        <>
          <div className="space-y-2">
            <Label
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              htmlFor="reg-a1"
            >
              {tReg('addressLine1')}
            </Label>
            <Input
              id="reg-a1"
              {...fieldErrorProps('reg-a1', fieldErrors['reg-a1'])}
              value={draft.addressLine1}
              onChange={(e) =>
                setDraft((d) => ({ ...d, addressLine1: e.target.value }))
              }
              required
            />
            <FieldError id="reg-a1" message={fieldErrors['reg-a1']} />
          </div>
          <div className="space-y-2">
            <Label
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              htmlFor="reg-a2"
            >
              {tReg('addressLine2')}
            </Label>
            <Input
              id="reg-a2"
              value={draft.addressLine2}
              onChange={(e) =>
                setDraft((d) => ({ ...d, addressLine2: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                htmlFor="reg-zip"
              >
                {tReg('postalCode')}
              </Label>
              <Input
                id="reg-zip"
                {...fieldErrorProps('reg-zip', fieldErrors['reg-zip'])}
                value={draft.addressPostalCode}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    addressPostalCode: e.target.value,
                  }))
                }
                required
              />
              <FieldError id="reg-zip" message={fieldErrors['reg-zip']} />
            </div>
            <div className="space-y-2">
              <Label
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                htmlFor="reg-city"
              >
                {tReg('city')}
              </Label>
              <Input
                id="reg-city"
                {...fieldErrorProps('reg-city', fieldErrors['reg-city'])}
                value={draft.addressCity}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, addressCity: e.target.value }))
                }
                required
              />
              <FieldError id="reg-city" message={fieldErrors['reg-city']} />
            </div>
          </div>
          <div className="space-y-2">
            <Label
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              htmlFor="reg-region"
            >
              {tReg('stateRegion')}
            </Label>
            <Input
              id="reg-region"
              value={draft.addressStateRegion}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  addressStateRegion: e.target.value,
                }))
              }
            />
          </div>
          {isDomestic ? (
            <div className="space-y-2">
              <Label
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                htmlFor="reg-bille"
              >
                {tReg('billingEmailDomestic')}
              </Label>
              <Input
                id="reg-bille"
                {...fieldErrorProps('reg-bille', fieldErrors['reg-bille'])}
                type="email"
                autoComplete="email"
                value={draft.billingEmail}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, billingEmail: e.target.value }))
                }
                aria-describedby={
                  fieldErrors['reg-bille']
                    ? 'reg-bille-error'
                    : 'reg-bille-hint'
                }
              />
              <p id="reg-bille-hint" className="text-xs text-muted-foreground">
                {tReg('billingEmailHint')}
              </p>
              <FieldError id="reg-bille" message={fieldErrors['reg-bille']} />
            </div>
          ) : null}
        </>
      ) : null}

      {draft.step === 2 && !isDomestic ? (
        <>
          {!isDomestic ? (
            <p className="text-xs text-muted-foreground">
              {tReg('foreignBankHint')}
            </p>
          ) : null}
          {!isDomestic ? (
            <>
              <div className="space-y-2">
                <Label
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  htmlFor="reg-bank"
                >
                  {tReg('bankName')}
                </Label>
                <Input
                  id="reg-bank"
                  {...fieldErrorProps('reg-bank', fieldErrors['reg-bank'])}
                  value={draft.bankName}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, bankName: e.target.value }))
                  }
                  required={!isDomestic}
                />
                <FieldError id="reg-bank" message={fieldErrors['reg-bank']} />
              </div>
              <div className="space-y-2">
                <Label
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  htmlFor="reg-iban"
                >
                  {tReg('iban')}
                </Label>
                <Input
                  id="reg-iban"
                  {...fieldErrorProps('reg-iban', fieldErrors['reg-iban'])}
                  value={draft.iban}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, iban: e.target.value }))
                  }
                  required={!isDomestic}
                />
                <FieldError id="reg-iban" message={fieldErrors['reg-iban']} />
              </div>
              <div className="space-y-2">
                <Label
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  htmlFor="reg-swift"
                >
                  {tReg('swift')}
                </Label>
                <Input
                  id="reg-swift"
                  {...fieldErrorProps('reg-swift', fieldErrors['reg-swift'])}
                  value={draft.swiftBic}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, swiftBic: e.target.value }))
                  }
                  required={!isDomestic}
                />
                <FieldError id="reg-swift" message={fieldErrors['reg-swift']} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    htmlFor="reg-bcc"
                  >
                    {tReg('bankCountry')}
                  </Label>
                  <Input
                    id="reg-bcc"
                    {...fieldErrorProps('reg-bcc', fieldErrors['reg-bcc'])}
                    value={draft.bankCountryCode}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        bankCountryCode: e.target.value.toUpperCase(),
                      }))
                    }
                    required={!isDomestic}
                    maxLength={2}
                  />
                  <FieldError id="reg-bcc" message={fieldErrors['reg-bcc']} />
                </div>
                <div className="space-y-2">
                  <Label
                    className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    htmlFor="reg-ccy"
                  >
                    {tReg('accountCurrency')}
                  </Label>
                  <Input
                    id="reg-ccy"
                    value={draft.accountCurrency}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        accountCurrency: e.target.value.toUpperCase(),
                      }))
                    }
                    required={!isDomestic}
                    maxLength={3}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  htmlFor="reg-invlang"
                >
                  {tReg('invoiceLanguage')}
                </Label>
                <SelectField
                  id="reg-invlang"
                  options={[
                    { value: 'sr', label: 'sr' },
                    { value: 'en', label: 'en' },
                  ]}
                  value={draft.invoiceLanguage}
                  onValueChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      invoiceLanguage: v,
                    }))
                  }
                  classNames={{
                    trigger: 'h-11 w-full rounded-xl font-normal',
                  }}
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  htmlFor="reg-bank-o"
                >
                  {tReg('bankName')}
                </Label>
                <Input
                  id="reg-bank-o"
                  value={draft.bankName}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, bankName: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    htmlFor="reg-iban-o"
                  >
                    {tReg('iban')}
                  </Label>
                  <Input
                    id="reg-iban-o"
                    value={draft.iban}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, iban: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    htmlFor="reg-swift-o"
                  >
                    {tReg('swift')}
                  </Label>
                  <Input
                    id="reg-swift-o"
                    value={draft.swiftBic}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, swiftBic: e.target.value }))
                    }
                  />
                </div>
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              htmlFor="reg-bille"
            >
              {tReg('billingEmail')}
            </Label>
            <Input
              id="reg-bille"
              {...fieldErrorProps('reg-bille', fieldErrors['reg-bille'])}
              type="email"
              value={draft.billingEmail}
              onChange={(e) =>
                setDraft((d) => ({ ...d, billingEmail: e.target.value }))
              }
              required
            />
            <FieldError id="reg-bille" message={fieldErrors['reg-bille']} />
          </div>
          <div className="space-y-2">
            <Label
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              htmlFor="reg-billp"
            >
              {tReg('billingPhone')}
            </Label>
            <Input
              id="reg-billp"
              value={draft.billingPhone}
              onChange={(e) =>
                setDraft((d) => ({ ...d, billingPhone: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              htmlFor="reg-billn"
            >
              {tReg('billingContactName')}
            </Label>
            <Input
              id="reg-billn"
              {...fieldErrorProps('reg-billn', fieldErrors['reg-billn'])}
              value={draft.billingContactName}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  billingContactName: e.target.value,
                }))
              }
              required
            />
            <FieldError id="reg-billn" message={fieldErrors['reg-billn']} />
          </div>
          <div className="space-y-2">
            <Label
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              htmlFor="reg-rp"
            >
              {tReg('responsiblePerson')}
            </Label>
            <Input
              id="reg-rp"
              value={draft.responsiblePerson}
              onChange={(e) =>
                setDraft((d) => ({ ...d, responsiblePerson: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              htmlFor="reg-rpos"
            >
              {tReg('responsiblePosition')}
            </Label>
            <Input
              id="reg-rpos"
              value={draft.responsiblePosition}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  responsiblePosition: e.target.value,
                }))
              }
            />
          </div>
          <p className="text-sm text-muted-foreground">{tReg('review')}</p>
        </>
      ) : null}

      {clientError ? (
        <p
          className={
            Object.keys(fieldErrors).length > 0
              ? 'text-sm text-destructive'
              : 'text-sm text-muted-foreground'
          }
          role={Object.keys(fieldErrors).length > 0 ? 'alert' : 'status'}
        >
          {clientError}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {draft.step === lastStep ? <SignUpLegalNotice /> : null}
      <div className="flex flex-wrap gap-2">
        {draft.step > 0 ? (
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-full"
            onClick={goBack}
          >
            {tReg('back')}
          </Button>
        ) : null}
        {draft.step < lastStep ? (
          <Button
            type="button"
            onClick={goNext}
            className="h-11 min-w-[8rem] rounded-full"
          >
            {tReg('next')}
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={register.isPending}
            className="h-11 min-w-[8rem] rounded-full"
          >
            {register.isPending ? t('creating') : tReg('submit')}
          </Button>
        )}
      </div>
    </form>
  );
}
