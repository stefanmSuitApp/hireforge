'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

import {
  postModeratorPublish,
  postModeratorPublishDirectly,
  postModeratorReject,
  postModeratorUnpublish,
} from '@/api/moderator-client';
import {
  invalidateEmployerTableQueries,
  moderatorQueryKeys,
} from '@/hooks/queries';
import type { ModeratorRejectBody } from 'contracts';

import { buildLocalizedPath, type AppLocale } from '@/i18n/localized-path';

export function useModeratorPublishMutation(jobId: string) {
  const locale = useLocale() as AppLocale;
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => postModeratorPublish(jobId),
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

export function useModeratorPublishDirectMutation(jobId: string | undefined) {
  const locale = useLocale() as AppLocale;
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => {
      if (!jobId) {
        throw new Error('Missing job id');
      }
      return postModeratorPublishDirectly(jobId);
    },
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

export function useModeratorRejectMutation(jobId: string) {
  const locale = useLocale() as AppLocale;
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (body: ModeratorRejectBody) => postModeratorReject(jobId, body),
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

export function useModeratorUnpublishMutation(jobId: string) {
  const locale = useLocale() as AppLocale;
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => postModeratorUnpublish(jobId),
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
