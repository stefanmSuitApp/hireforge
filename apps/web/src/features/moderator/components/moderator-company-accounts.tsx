'use client';

import type {
  StaffAccountInviteResponse,
  StaffCompanyEmployerMember,
} from 'contracts';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState, type SubmitEvent } from 'react';

import {
  postStaffCompanyAccount,
  postStaffResendInvite,
} from '@/api/staff-client';
import { Button, Input, Label } from '@/components/ui';
import { SelectField } from '@/components/ui/select';
import {
  getTranslatedApiErrorMessage,
  type ErrorsTranslator,
} from '@/lib/http/api-error-message';

type InviteLocale = 'sr' | 'en';

/**
 * Employer accounts of a company: staff add one (the person gets an invite
 * link to set a password) and resend the link until it is used.
 */
export function ModeratorCompanyAccounts({
  companyId,
  members,
}: {
  companyId: string;
  members: StaffCompanyEmployerMember[];
}) {
  const t = useTranslations('Moderator.companies.accounts');
  const tErrors = useTranslations('Errors');
  const router = useRouter();
  const uiLocale = useLocale();
  const [email, setEmail] = useState('');
  const [inviteLocale, setInviteLocale] = useState<InviteLocale>(
    uiLocale === 'en' ? 'en' : 'sr',
  );
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<
    (StaffAccountInviteResponse & { email: string }) | null
  >(null);
  const [copied, setCopied] = useState(false);

  async function run(
    key: string,
    to: string,
    call: () => Promise<StaffAccountInviteResponse>,
  ) {
    setPending(key);
    setError(null);
    setCopied(false);
    try {
      const res = await call();
      setResult({ ...res, email: to });
      router.refresh();
      return true;
    } catch (err) {
      setError(getTranslatedApiErrorMessage(err, tErrors as ErrorsTranslator));
      return false;
    } finally {
      setPending(null);
    }
  }

  async function onAdd(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const to = email.trim().toLowerCase();
    const ok = await run('add', to, () =>
      postStaffCompanyAccount(companyId, { email: to, locale: inviteLocale }),
    );
    if (ok) setEmail('');
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Clipboard blocked (permissions, http): the field stays selectable.
    }
  }

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
      <h3 className="text-base font-semibold text-foreground">
        {t('heading')}
      </h3>
      {members.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{t('none')}</p>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-xl border border-border/70">
          {members.map((m) => (
            <li
              key={m.employerId}
              data-testid="company-member"
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
            >
              <span className="min-w-0 break-all font-mono">{m.email}</span>
              <span className="flex items-center gap-2">
                <span
                  className={
                    m.activated
                      ? 'rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary'
                      : 'rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground'
                  }
                >
                  {m.activated ? t('active') : t('waiting')}
                </span>
                {m.activated ? null : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending !== null}
                    onClick={() =>
                      run(m.userId, m.email, () =>
                        postStaffResendInvite(
                          companyId,
                          m.userId,
                          inviteLocale,
                        ),
                      )
                    }
                  >
                    {pending === m.userId ? t('sending') : t('resend')}
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {result ? (
        <div
          data-testid="invite-result"
          className="mt-4 space-y-2 rounded-xl border border-border/70 bg-muted/40 p-3"
        >
          <p role="status" className="m-0 text-sm text-foreground">
            {result.emailSent
              ? t('sent', { email: result.email })
              : t('notSent', { email: result.email })}
          </p>
          <Label htmlFor="invite-link">{t('linkLabel')}</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="invite-link"
              readOnly
              value={result.inviteUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="font-mono text-xs"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => copyLink(result.inviteUrl)}
            >
              {copied ? t('copied') : t('copy')}
            </Button>
          </div>
          <p className="m-0 text-xs text-muted-foreground">{t('linkHint')}</p>
        </div>
      ) : null}

      <form onSubmit={onAdd} className="mt-5 space-y-3">
        <h4 className="text-sm font-semibold text-foreground">
          {t('addHeading')}
        </h4>
        <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
          <div className="space-y-2">
            <Label htmlFor="account-email">{t('email')}</Label>
            <Input
              id="account-email"
              type="email"
              autoComplete="off"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-locale">{t('language')}</Label>
            <SelectField
              id="account-locale"
              value={inviteLocale}
              onValueChange={(v) => setInviteLocale(v as InviteLocale)}
              options={[
                { value: 'sr', label: t('languageSr') },
                { value: 'en', label: t('languageEn') },
              ]}
            />
          </div>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">{t('addHint')}</p>
        <Button type="submit" disabled={pending !== null}>
          {pending === 'add' ? t('sending') : t('send')}
        </Button>
      </form>
    </section>
  );
}
