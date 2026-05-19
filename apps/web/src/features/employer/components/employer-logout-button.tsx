'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { useEmployerLogoutMutation } from '@/hooks/mutations';
import {
  getTranslatedApiErrorMessage,
  type ErrorsTranslator,
} from '@/lib/http/api-error-message';

export function EmployerLogoutButton() {
  const t = useTranslations('Employer');
  const tErrors = useTranslations('Errors');
  const logout = useEmployerLogoutMutation();

  return (
    <div className="flex flex-col items-end gap-2">
      {logout.isError ? (
        <p
          className="max-w-xs text-right text-sm text-destructive"
          role="alert"
        >
          {getTranslatedApiErrorMessage(
            logout.error,
            tErrors as ErrorsTranslator,
          )}
        </p>
      ) : null}
      <Button
        type="button"
        variant="outline"
        disabled={logout.isPending}
        onClick={() => logout.mutate()}
      >
        {t('logout')}
      </Button>
    </div>
  );
}
