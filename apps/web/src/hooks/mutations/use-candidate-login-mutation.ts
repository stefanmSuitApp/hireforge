'use client';

import { useMutation } from '@tanstack/react-query';

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
      if (ret?.startsWith('/')) {
        navigateWithFreshSession(ret);
        return;
      }
      navigateWithFreshSession('/candidate');
    },
  });
}
