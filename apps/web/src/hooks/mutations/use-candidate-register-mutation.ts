'use client';

import { useMutation } from '@tanstack/react-query';

import { useLocale } from 'next-intl';

import { stripLocalePrefix, type AppLocale } from '@/i18n/localized-path';
import { navigateWithFreshSession } from '@/lib/session-navigation';

import {
  postCandidateRegister,
  type CandidateRegisterBody,
} from '@/api/candidate-auth';
import { isSafeReturnPath } from '@/lib/safe-return-path';

type Vars = { body: CandidateRegisterBody; returnTo?: string | null };

export function useCandidateRegisterMutation() {
  const locale = useLocale() as AppLocale;
  return useMutation({
    mutationFn: (vars: Vars) => postCandidateRegister(vars.body),
    onSuccess: (_data, variables) => {
      // Back to the job (or list) that sent the visitor here, like login.
      const ret = variables.returnTo;
      if (isSafeReturnPath(ret)) {
        navigateWithFreshSession(locale, stripLocalePrefix(ret));
        return;
      }
      navigateWithFreshSession(locale, '/candidate');
    },
  });
}
