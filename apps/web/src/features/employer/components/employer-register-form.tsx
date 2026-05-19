'use client';

import {
  employerSelfSignupBodySchema,
  isEUCountry,
  type EmployerSelfSignupBody,
} from 'contracts';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type SubmitEvent } from 'react';

import { Button, Input, Label, PasswordInput } from '@/components/ui';
import { SelectField } from '@/components/ui/select';
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
        responsiblePerson: d.responsiblePerson.trim() || undefined,
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
      step: Math.min(Math.max(parsed.step ?? 0, 0), 3),
    };
  } catch {
    return null;
  }
}

export function EmployerRegisterForm() {
  const t = useTranslations('Employer');
  const tReg = useTranslations('Employer.register');
  const tErrors = useTranslations('Errors');
  const register = useEmployerRegisterMutation();
  const draftReady = useRef(false);
  const [draft, setDraft] = useState<DraftFields>(emptyDraft);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);

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

  const steps = [
    tReg('stepAccount'),
    tReg('stepCompany'),
    tReg('stepAddress'),
    tReg('stepBilling'),
  ];

  function validateStep(step: number): boolean {
    setClientError(null);
    if (step === 0) {
      if (!draft.email.includes('@')) {
        setClientError(tReg('validationFailed'));
        return false;
      }
      if (password.length < 8) {
        setClientError(tReg('validationFailed'));
        return false;
      }
      return true;
    }
    if (step === 1) {
      if (!draft.legalName.trim()) {
        setClientError(tReg('validationFailed'));
        return false;
      }
      if (isDomestic) {
        if (!draft.pib.trim() || !draft.mb.trim()) {
          setClientError(tReg('validationFailed'));
          return false;
        }
      } else if (isEUCountry(draft.countryCode)) {
        if (!draft.vatId.trim()) {
          setClientError(tReg('validationFailed'));
          return false;
        }
      } else if (!draft.taxId.trim()) {
        setClientError(tReg('validationFailed'));
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (
        !draft.addressLine1.trim() ||
        !draft.addressPostalCode.trim() ||
        !draft.addressCity.trim()
      ) {
        setClientError(tReg('validationFailed'));
        return false;
      }
      return true;
    }
    if (step === 3) {
      if (!draft.billingEmail.trim() || !draft.billingContactName.trim()) {
        setClientError(tReg('validationFailed'));
        return false;
      }
      if (!isDomestic) {
        if (
          !draft.bankName.trim() ||
          !draft.iban.trim() ||
          !draft.swiftBic.trim() ||
          !draft.bankCountryCode.trim()
        ) {
          setClientError(tReg('validationFailed'));
          return false;
        }
      }
      return true;
    }
    return true;
  }

  function goNext() {
    if (!validateStep(draft.step)) return;
    setDraft((d) => ({ ...d, step: Math.min(d.step + 1, 3) }));
  }

  function goBack() {
    setClientError(null);
    setDraft((d) => ({ ...d, step: Math.max(d.step - 1, 0) }));
  }

  function onSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (draft.step < 3) {
      goNext();
      return;
    }
    if (!validateStep(3)) return;
    setError(null);
    const body = buildSignupBody(draft, password);
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
      onSubmit={onSubmit}
      className="flex flex-col gap-5 [&_input]:h-11 [&_input]:rounded-xl [&_input]:border-border/70 [&_input]:bg-background/90"
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
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="reg-email">{t('email')}</Label>
            <Input
              id="reg-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={draft.email}
              onChange={(e) =>
                setDraft((d) => ({ ...d, email: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="reg-password">{t('password')}</Label>
            <PasswordInput
              id="reg-password"
              name="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              showLabel={t('passwordShow')}
              hideLabel={t('passwordHide')}
              className="h-11 rounded-xl border-border/70 bg-background/90"
            />
            <p className="text-xs text-muted-foreground">{t('passwordHint')}</p>
          </div>
        </>
      ) : null}

      {draft.step === 1 ? (
        <>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="reg-country">{tReg('country')}</Label>
            <SelectField
              id="reg-country"
              options={COUNTRY_CODES.map((code) => ({
                value: code,
                label: code,
              }))}
              value={draft.countryCode}
              onValueChange={(v) => applyCountryDefaults(v)}
              classNames={{
                trigger:
                  'h-11 w-full rounded-xl border-border/70 bg-background/90 font-normal',
              }}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="reg-legal">{t('legalName')}</Label>
            <Input
              id="reg-legal"
              value={draft.legalName}
              onChange={(e) =>
                setDraft((d) => ({ ...d, legalName: e.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="reg-slug">{t('companySlug')}</Label>
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
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="reg-pib">{tReg('pib')}</Label>
                <Input
                  id="reg-pib"
                  inputMode="numeric"
                  value={draft.pib}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, pib: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="reg-mb">{tReg('mb')}</Label>
                <Input
                  id="reg-mb"
                  inputMode="numeric"
                  value={draft.mb}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, mb: e.target.value }))
                  }
                  required
                />
              </div>
            </>
          ) : isEUCountry(draft.countryCode) ? (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="reg-vat">{tReg('vatId')}</Label>
              <Input
                id="reg-vat"
                value={draft.vatId}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    vatId: e.target.value.toUpperCase(),
                  }))
                }
                required
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="reg-tax">{tReg('taxId')}</Label>
              <Input
                id="reg-tax"
                value={draft.taxId}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, taxId: e.target.value }))
                }
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="reg-regno">{tReg('registrationNumber')}</Label>
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

      {draft.step === 2 ? (
        <>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="reg-a1">{tReg('addressLine1')}</Label>
            <Input
              id="reg-a1"
              value={draft.addressLine1}
              onChange={(e) =>
                setDraft((d) => ({ ...d, addressLine1: e.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="reg-a2">{tReg('addressLine2')}</Label>
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
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="reg-zip">{tReg('postalCode')}</Label>
              <Input
                id="reg-zip"
                value={draft.addressPostalCode}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    addressPostalCode: e.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="reg-city">{tReg('city')}</Label>
              <Input
                id="reg-city"
                value={draft.addressCity}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, addressCity: e.target.value }))
                }
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="reg-region">{tReg('stateRegion')}</Label>
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
        </>
      ) : null}

      {draft.step === 3 ? (
        <>
          {!isDomestic ? (
            <p className="text-xs text-muted-foreground">
              {tReg('foreignBankHint')}
            </p>
          ) : null}
          {!isDomestic ? (
            <>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="reg-bank">{tReg('bankName')}</Label>
                <Input
                  id="reg-bank"
                  value={draft.bankName}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, bankName: e.target.value }))
                  }
                  required={!isDomestic}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="reg-iban">{tReg('iban')}</Label>
                <Input
                  id="reg-iban"
                  value={draft.iban}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, iban: e.target.value }))
                  }
                  required={!isDomestic}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="reg-swift">{tReg('swift')}</Label>
                <Input
                  id="reg-swift"
                  value={draft.swiftBic}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, swiftBic: e.target.value }))
                  }
                  required={!isDomestic}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="reg-bcc">{tReg('bankCountry')}</Label>
                  <Input
                    id="reg-bcc"
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
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="reg-ccy">{tReg('accountCurrency')}</Label>
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
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="reg-invlang">{tReg('invoiceLanguage')}</Label>
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
                    trigger:
                      'h-11 w-full rounded-xl border-border/70 bg-background/90 font-normal',
                  }}
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="reg-bank-o">{tReg('bankName')}</Label>
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
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="reg-iban-o">{tReg('iban')}</Label>
                  <Input
                    id="reg-iban-o"
                    value={draft.iban}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, iban: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="reg-swift-o">{tReg('swift')}</Label>
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
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="reg-bille">{tReg('billingEmail')}</Label>
            <Input
              id="reg-bille"
              type="email"
              value={draft.billingEmail}
              onChange={(e) =>
                setDraft((d) => ({ ...d, billingEmail: e.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="reg-billp">{tReg('billingPhone')}</Label>
            <Input
              id="reg-billp"
              value={draft.billingPhone}
              onChange={(e) =>
                setDraft((d) => ({ ...d, billingPhone: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="reg-billn">{tReg('billingContactName')}</Label>
            <Input
              id="reg-billn"
              value={draft.billingContactName}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  billingContactName: e.target.value,
                }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="reg-rp">{tReg('responsiblePerson')}</Label>
            <Input
              id="reg-rp"
              value={draft.responsiblePerson}
              onChange={(e) =>
                setDraft((d) => ({ ...d, responsiblePerson: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="reg-rpos">{tReg('responsiblePosition')}</Label>
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
        <p className="text-sm text-amber-700 dark:text-amber-400" role="status">
          {clientError}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

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
        {draft.step < 3 ? (
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
