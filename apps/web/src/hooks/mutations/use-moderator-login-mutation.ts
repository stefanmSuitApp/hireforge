'use client';

import { useMutation } from '@tanstack/react-query';
import { useLocale } from 'next-intl';

import type { AppLocale } from '@/i18n/localized-path';
import { navigateWithFreshSession } from '@/lib/session-navigation';

import { postModeratorLogin } from '@/api/moderator-client';

export function useModeratorLoginMutation() {
  const locale = useLocale() as AppLocale;
  return useMutation({
    mutationFn: postModeratorLogin,
    onSuccess: () => {
      navigateWithFreshSession(locale, '/moderator');
    },
  });
}
