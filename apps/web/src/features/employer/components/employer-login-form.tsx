'use client';

import { useTranslations } from 'next-intl';
import { useState, type SubmitEvent } from 'react';

import { Button, Input, Label, PasswordInput } from '@/components/ui';
import { useEmployerLoginMutation } from '@/hooks/mutations';
import {
  getTranslatedApiErrorMessage,
  type ErrorsTranslator,
} from '@/lib/http/api-error-message';

type Props = { returnTo?: string | null };

export function EmployerLoginForm({ returnTo }: Props) {
  const t = useTranslations('Employer');
  const tErrors = useTranslations('Errors');
  const login = useEmployerLoginMutation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    login.mutate(
      { body: { email, password }, returnTo },
      {
        onError: (err) => {
          setError(
            getTranslatedApiErrorMessage(err, tErrors as ErrorsTranslator),
          );
        },
      },
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label
          htmlFor="employer-email"
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {t('email')}
        </Label>
        <Input
          id="employer-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 rounded-xl border-border/70 bg-background/90"
        />
      </div>
      <div className="space-y-2">
        <Label
          htmlFor="employer-password"
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {t('password')}
        </Label>
        <PasswordInput
          id="employer-password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          showLabel={t('passwordShow')}
          hideLabel={t('passwordHide')}
          className="h-11 rounded-xl border-border/70 bg-background/90"
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={login.isPending}
        className="mt-1 h-11 w-full rounded-full"
      >
        {login.isPending ? t('signingIn') : t('signIn')}
      </Button>
    </form>
  );
}
