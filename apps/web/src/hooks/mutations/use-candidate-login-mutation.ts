'use client';

import { useMutation } from '@tanstack/react-query';

import { stripLocalePrefix } from '@/i18n/localized-path';
import { useRouter } from '@/i18n/navigation';

import {
  postCandidateLogin,
  type CandidateLoginBody,
} from '@/api/candidate-auth';

type Vars = { body: CandidateLoginBody; returnTo?: string | null };

export function useCandidateLoginMutation() {
  const router = useRouter();

  function navigateWithFreshSession(path: string) {
    router.replace(path);
    router.refresh();
  }

  return useMutation({
    mutationFn: (vars: Vars) => postCandidateLogin(vars.body),
    onSuccess: (_data, variables) => {
      const ret = variables.returnTo;
      if (ret?.startsWith('/') && !ret.startsWith('//')) {
        // `returnTo` may carry the locale (`/sr/jobs/x/apply`, from the apply
        // page); the locale-aware router adds it again otherwise (`/sr/sr/…`).
        navigateWithFreshSession(stripLocalePrefix(ret));
        return;
      }
      navigateWithFreshSession('/candidate');
    },
  });
}
