'use client';

import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState, type SubmitEvent } from 'react';

import { Button, Label, PasswordInput } from '@/components/ui';
import { SignUpLegalNotice } from '@/features/legal/legal-links';
import { Link } from '@/i18n/navigation';
import {
  getTranslatedApiErrorMessage,
  type ErrorsTranslator,
} from '@/lib/http/api-error-message';
import { webHttp } from '@/lib/http/web-axios';

/**
 * Token comes from the emailed link; nothing is consumed until the form is
 * submitted. `invite`: a staff-created employer account sets its first
 * password (and accepts the terms, as on sign-up).
 */
export function ResetPasswordForm({
  token,
  mode = 'reset',
}: {
  token: string;
  mode?: 'reset' | 'invite';
}) {
  const invite = mode === 'invite';
  const idPrefix = invite ? 'invite-password' : 'reset-password';
  const t = useTranslations('AccountEmail');
  const tErrors = useTranslations('Errors');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [mismatch, setMismatch] = useState(false);

  const reset = useMutation({
    mutationFn: () =>
      webHttp.post(
        invite ? '/api/auth/invite/accept' : '/api/auth/password-reset/confirm',
        { token, password },
      ),
  });

  function onSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password !== confirm) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    reset.mutate();
  }

  if (reset.isSuccess) {
    return (
      <div className="flex flex-col gap-4 text-sm">
        <p role="status" className="m-0 text-foreground">
          {invite ? t('inviteDone') : t('resetDone')}
        </p>
        <Button asChild className="h-11 rounded-full">
          <Link href={invite ? '/employer/login' : '/sign-in'}>
            {t('goToSignIn')}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor={idPrefix}>{t('newPassword')}</Label>
        <PasswordInput
          id={idPrefix}
          autoComplete="new-password"
          showLabel={t('passwordShow')}
          hideLabel={t('passwordHide')}
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="m-0 text-xs text-muted-foreground">{t('passwordHint')}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-confirm`}>{t('confirmPassword')}</Label>
        <PasswordInput
          id={`${idPrefix}-confirm`}
          autoComplete="new-password"
          showLabel={t('passwordShow')}
          hideLabel={t('passwordHide')}
          minLength={8}
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      {mismatch ? (
        <p role="alert" className="text-sm text-destructive">
          {t('passwordMismatch')}
        </p>
      ) : null}
      {reset.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {getTranslatedApiErrorMessage(
            reset.error,
            tErrors as ErrorsTranslator,
          )}
        </p>
      ) : null}
      {invite ? <SignUpLegalNotice /> : null}
      <Button
        type="submit"
        disabled={reset.isPending}
        className="h-11 rounded-full"
      >
        {invite ? t('inviteSubmit') : t('resetSubmit')}
      </Button>
    </form>
  );
}
