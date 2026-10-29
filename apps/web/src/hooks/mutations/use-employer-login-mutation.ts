'use client';

import { useMutation } from '@tanstack/react-query';
import { useLocale } from 'next-intl';

import { stripLocalePrefix, type AppLocale } from '@/i18n/localized-path';
import { navigateWithFreshSession } from '@/lib/session-navigation';

import { postEmployerLogin, type EmployerLoginBody } from '@/api/employer-auth';
import { isSafeReturnPath } from '@/lib/safe-return-path';

type Vars = { body: EmployerLoginBody; returnTo?: string | null };

export function useEmployerLoginMutation() {
  const locale = useLocale() as AppLocale;

  return useMutation({
    mutationFn: (vars: Vars) => postEmployerLogin(vars.body),
    onSuccess: (_data, variables) => {
      const ret = variables.returnTo;
      if (isSafeReturnPath(ret)) {
        // `returnTo` may carry the locale; strip it so it is not added twice.
        navigateWithFreshSession(locale, stripLocalePrefix(ret));
        return;
      }
      navigateWithFreshSession(locale, '/employer');
    },
  });
}
