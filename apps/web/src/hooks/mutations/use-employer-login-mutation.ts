'use client';

import { useMutation } from '@tanstack/react-query';
import { stripLocalePrefix } from '@/i18n/localized-path';
import { useRouter } from '@/i18n/navigation';

import { postEmployerLogin, type EmployerLoginBody } from '@/api/employer-auth';

type Vars = { body: EmployerLoginBody; returnTo?: string | null };

export function useEmployerLoginMutation() {
  const router = useRouter();

  function navigateWithFreshSession(path: string) {
    router.replace(path);
    router.refresh();
  }

  return useMutation({
    mutationFn: (vars: Vars) => postEmployerLogin(vars.body),
    onSuccess: (_data, variables) => {
      const ret = variables.returnTo;
      if (ret?.startsWith('/') && !ret.startsWith('//')) {
        // `returnTo` may carry the locale; the router adds it otherwise.
        navigateWithFreshSession(stripLocalePrefix(ret));
        return;
      }
      navigateWithFreshSession('/employer');
    },
  });
}
