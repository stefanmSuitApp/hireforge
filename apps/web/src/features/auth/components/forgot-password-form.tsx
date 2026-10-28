'use client';

import { useMutation } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useState, type SubmitEvent } from 'react';

import { Button, Input, Label } from '@/components/ui';
import {
  getTranslatedApiErrorMessage,
  type ErrorsTranslator,
} from '@/lib/http/api-error-message';
import { webHttp } from '@/lib/http/web-axios';

export function ForgotPasswordForm() {
  const t = useTranslations('AccountEmail');
  const tErrors = useTranslations('Errors');
  const locale = useLocale();
  const [email, setEmail] = useState('');

  const request = useMutation({
    mutationFn: () =>
      webHttp.post('/api/auth/password-reset/request', {
        email,
        locale: locale === 'en' ? 'en' : 'sr',
      }),
  });

  function onSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    request.mutate();
  }

  if (request.isSuccess) {
    return (
      <p role="status" className="text-sm text-foreground">
        {t('resetRequestSent')}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor="forgot-email">{t('email')}</Label>
        <Input
          id="forgot-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 rounded-xl"
        />
      </div>
      {request.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {getTranslatedApiErrorMessage(
            request.error,
            tErrors as ErrorsTranslator,
          )}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={request.isPending}
        className="h-11 rounded-full"
      >
        {t('resetRequestSubmit')}
      </Button>
    </form>
  );
}
