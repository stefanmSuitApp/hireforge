'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

import { postEmployerJobSubmit } from '@/api/employer-jobs';
import { buildLocalizedPath, type AppLocale } from '@/i18n/localized-path';
import { invalidateEmployerTableQueries } from '@/hooks/queries';

export function useEmployerJobSubmitMutation() {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => postEmployerJobSubmit(jobId),
    onSuccess: async () => {
      await invalidateEmployerTableQueries(queryClient);
      router.push(buildLocalizedPath(locale, '/employer/jobs'));
      router.refresh();
    },
  });
}
