'use client';

import { useMutation } from '@tanstack/react-query';
import { useLocale } from 'next-intl';

import type { AppLocale } from '@/i18n/localized-path';
import { navigateWithFreshSession } from '@/lib/session-navigation';

import { postEmployerLogout } from '@/api/employer-auth';

export function useEmployerLogoutMutation() {
  const locale = useLocale() as AppLocale;
  return useMutation({
    mutationFn: () => postEmployerLogout(),
    onSuccess: () => {
      navigateWithFreshSession(locale, '/employer/login');
    },
  });
}
