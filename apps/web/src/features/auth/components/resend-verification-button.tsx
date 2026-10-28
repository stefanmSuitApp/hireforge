'use client';

import { useMutation } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  getTranslatedApiErrorMessage,
  type ErrorsTranslator,
} from '@/lib/http/api-error-message';
import { webHttp } from '@/lib/http/web-axios';

/** "Send the confirmation email again" for the signed-in user. */
export function ResendVerificationButton() {
  const t = useTranslations('AccountEmail');
  const tErrors = useTranslations('Errors');
  const locale = useLocale();

  const resend = useMutation({
    mutationFn: () =>
      webHttp.post('/api/auth/verify-email/resend', {
        locale: locale === 'en' ? 'en' : 'sr',
      }),
  });

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={resend.isPending || resend.isSuccess}
        onClick={() => resend.mutate()}
      >
        {t('resendVerification')}
      </Button>
      {resend.isSuccess ? (
        <span role="status" className="text-xs text-muted-foreground">
          {t('resendVerificationSent')}
        </span>
      ) : null}
      {resend.isError ? (
        <span role="alert" className="text-xs text-destructive">
          {getTranslatedApiErrorMessage(
            resend.error,
            tErrors as ErrorsTranslator,
          )}
        </span>
      ) : null}
    </div>
  );
}
