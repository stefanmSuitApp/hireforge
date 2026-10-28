'use client';

import { useMutation } from '@tanstack/react-query';
import { useLocale } from 'next-intl';

import { stripLocalePrefix, type AppLocale } from '@/i18n/localized-path';
import { navigateWithFreshSession } from '@/lib/session-navigation';

import {
  postCandidateLogin,
  type CandidateLoginBody,
} from '@/api/candidate-auth';

type Vars = { body: CandidateLoginBody; returnTo?: string | null };

export function useCandidateLoginMutation() {
  const locale = useLocale() as AppLocale;

  return useMutation({
    mutationFn: (vars: Vars) => postCandidateLogin(vars.body),
    onSuccess: (_data, variables) => {
      const ret = variables.returnTo;
      if (ret?.startsWith('/') && !ret.startsWith('//')) {
        // `returnTo` may carry the locale (`/sr/jobs/x/apply`, from the apply
        // page); strip it so it is not added twice (`/sr/sr/…`).
        navigateWithFreshSession(locale, stripLocalePrefix(ret));
        return;
      }
      navigateWithFreshSession(locale, '/candidate');
    },
  });
}
