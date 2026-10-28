'use client';

import { useMutation } from '@tanstack/react-query';
import { useLocale } from 'next-intl';

import type { AppLocale } from '@/i18n/localized-path';
import { navigateWithFreshSession } from '@/lib/session-navigation';

import {
  postEmployerRegister,
  type EmployerRegisterBody,
} from '@/api/employer-auth';

export function useEmployerRegisterMutation() {
  const locale = useLocale() as AppLocale;
  return useMutation({
    mutationFn: (body: EmployerRegisterBody) => postEmployerRegister(body),
    onSuccess: () => {
      navigateWithFreshSession(locale, '/employer');
    },
  });
}
