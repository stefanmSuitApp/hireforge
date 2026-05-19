'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import { postModeratorLogout } from '@/api/moderator-client';
import {
  getTranslatedApiErrorMessage,
  type ErrorsTranslator,
} from '@/lib/http/api-error-message';

export function ModeratorLogoutButton() {
  const t = useTranslations('Moderator');
  const tErrors = useTranslations('Errors');
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onLogout() {
    setError(null);
    setPending(true);
    try {
      await postModeratorLogout();
      router.replace('/moderator/login');
    } catch (err) {
      setError(getTranslatedApiErrorMessage(err, tErrors as ErrorsTranslator));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {error ? (
        <p
          className="max-w-xs text-right text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={onLogout}
      >
        {t('logout')}
      </Button>
    </div>
  );
}
