'use client';

import { useMutation } from '@tanstack/react-query';

import { useLocale } from 'next-intl';

import type { AppLocale } from '@/i18n/localized-path';
import { navigateWithFreshSession } from '@/lib/session-navigation';

import { postCandidateLogout } from '@/api/candidate-auth';

export function useCandidateLogoutMutation() {
  const locale = useLocale() as AppLocale;
  return useMutation({
    mutationFn: () => postCandidateLogout(),
    onSuccess: () => {
      navigateWithFreshSession(locale, '/candidate/login');
    },
  });
}
