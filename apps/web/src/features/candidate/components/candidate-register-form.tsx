'use client';

import { useTranslations } from 'next-intl';
import { useState, type SubmitEvent } from 'react';

import { Button, Input, Label, PasswordInput } from '@/components/ui';
import { useCandidateRegisterMutation } from '@/hooks/mutations';
import {
  getTranslatedApiErrorMessage,
  type ErrorsTranslator,
} from '@/lib/http/api-error-message';

export function CandidateRegisterForm() {
  const t = useTranslations('Candidate');
  const tErrors = useTranslations('Errors');
  const register = useCandidateRegisterMutation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    register.mutate(
      { email, password, fullName: fullName.trim() || undefined },
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
          htmlFor="candidate-reg-name"
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {t('fullName')}
        </Label>
        <Input
          id="candidate-reg-name"
          name="fullName"
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder={t('fullNameOptional')}
          className="h-11 rounded-xl border-border/70 bg-background/90"
        />
      </div>
      <div className="space-y-2">
        <Label
          htmlFor="candidate-reg-email"
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {t('email')}
        </Label>
        <Input
          id="candidate-reg-email"
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
          htmlFor="candidate-reg-password"
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {t('password')}
        </Label>
        <PasswordInput
          id="candidate-reg-password"
          name="password"
          autoComplete="new-password"
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
        disabled={register.isPending}
        className="mt-1 h-11 w-full rounded-full"
      >
        {register.isPending ? t('creatingAccount') : t('createAccount')}
      </Button>
    </form>
  );
}
