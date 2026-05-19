'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import * as React from 'react';

import {
  patchModeratorJobDraft,
  postModeratorJobDraft,
} from '@/api/moderator-job-drafts';
import type {
  EmployerJobDraftBody,
  ModeratorCreateJobDraftBody,
} from 'contracts';

import { buildLocalizedPath, type AppLocale } from '@/i18n/localized-path';
import {
  invalidateEmployerTableQueries,
  moderatorQueryKeys,
} from '@/hooks/queries';

type DraftBody = EmployerJobDraftBody | ModeratorCreateJobDraftBody;

type MutateOpts = {
  onSuccess?: (data: unknown, variables: DraftBody, context: unknown) => void;
  onError?: (err: Error, variables: DraftBody, context: unknown) => void;
};

export function useModeratorJobDraftSaveMutation(opts: {
  mode: 'create' | 'edit';
  jobId?: string;
}) {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (body: DraftBody) => {
      if (opts.mode === 'create') {
        return postModeratorJobDraft(body as ModeratorCreateJobDraftBody);
      }
      if (!opts.jobId) {
        throw new Error('Missing job id');
      }
      return patchModeratorJobDraft(opts.jobId, body as EmployerJobDraftBody);
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: moderatorQueryKeys.all });
      void invalidateEmployerTableQueries(queryClient);
      if (
        data &&
        typeof data === 'object' &&
        'status' in data &&
        (data as { status?: string }).status === 'submitted'
      ) {
        if (opts.jobId) {
          router.push(
            buildLocalizedPath(locale, `/moderator/jobs/${opts.jobId}`),
          );
          router.refresh();
        }
        return;
      }
      if (
        opts.mode === 'create' &&
        data &&
        typeof data === 'object' &&
        'id' in data
      ) {
        router.push(
          buildLocalizedPath(
            locale,
            `/moderator/jobs/${(data as { id: string }).id}/edit`,
          ),
        );
        return;
      }
      if (opts.mode === 'edit' && opts.jobId) {
        void queryClient.invalidateQueries({
          queryKey: moderatorQueryKeys.job(opts.jobId),
        });
      }
      if (opts.mode !== 'edit') {
        router.refresh();
      }
    },
  });

  const patchChainRef = React.useRef(Promise.resolve());

  const mutate = React.useCallback(
    (body: DraftBody, callbacks?: MutateOpts) => {
      if (opts.mode !== 'edit') {
        mutation.mutate(body, {
          onSuccess: callbacks?.onSuccess,
          onError: callbacks?.onError,
        });
        return;
      }
      patchChainRef.current = patchChainRef.current
        .then(() => mutation.mutateAsync(body))
        .then((data) => {
          callbacks?.onSuccess?.(data, body, undefined);
        })
        .catch((err: unknown) => {
          const e = err instanceof Error ? err : new Error(String(err));
          callbacks?.onError?.(e, body, undefined);
        });
    },
    [mutation, opts.mode],
  );

  return { ...mutation, mutate };
}
