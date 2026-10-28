'use client';

import { useMutation } from '@tanstack/react-query';

import { useLocale } from 'next-intl';

import type { AppLocale } from '@/i18n/localized-path';
import { navigateWithFreshSession } from '@/lib/session-navigation';

import {
  postCandidateRegister,
  type CandidateRegisterBody,
} from '@/api/candidate-auth';

export function useCandidateRegisterMutation() {
  const locale = useLocale() as AppLocale;
  return useMutation({
    mutationFn: (body: CandidateRegisterBody) => postCandidateRegister(body),
    onSuccess: () => {
      navigateWithFreshSession(locale, '/candidate');
    },
  });
}
