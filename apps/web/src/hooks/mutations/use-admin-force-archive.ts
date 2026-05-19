'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

import { postAdminForceArchive } from '@/api/staff-client';
import {
  invalidateEmployerTableQueries,
  moderatorQueryKeys,
} from '@/hooks/queries';

import { buildLocalizedPath, type AppLocale } from '@/i18n/localized-path';

export function useAdminForceArchiveMutation(jobId: string) {
  const locale = useLocale() as AppLocale;
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => postAdminForceArchive(jobId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: moderatorQueryKeys.all }),
        invalidateEmployerTableQueries(queryClient),
      ]);
      router.push(buildLocalizedPath(locale, '/moderator'));
      router.refresh();
    },
  });
}
