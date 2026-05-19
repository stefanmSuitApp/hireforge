'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import * as React from 'react';

import {
  patchEmployerJobDraft,
  postEmployerJobDraft,
} from '@/api/employer-jobs';
import type { EmployerJobDraftBody } from 'contracts';

import { buildLocalizedPath, type AppLocale } from '@/i18n/localized-path';
import { invalidateEmployerTableQueries } from '@/hooks/queries';

type MutateOpts = {
  onSuccess?: (
    data: unknown,
    variables: EmployerJobDraftBody,
    context: unknown,
  ) => void;
  onError?: (
    err: Error,
    variables: EmployerJobDraftBody,
    context: unknown,
  ) => void;
};

export function useSaveEmployerJobDraftMutation(opts: {
  mode: 'create' | 'edit';
  jobId?: string;
}) {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (body: EmployerJobDraftBody) => {
      if (opts.mode === 'create') {
        return postEmployerJobDraft(body);
      }
      if (!opts.jobId) {
        throw new Error('Missing job id');
      }
      return patchEmployerJobDraft(opts.jobId, body);
    },
    onSuccess: async (data) => {
      await invalidateEmployerTableQueries(queryClient);
      if (
        data &&
        typeof data === 'object' &&
        'status' in data &&
        (data as { status?: string }).status === 'submitted'
      ) {
        router.push(buildLocalizedPath(locale, '/employer/jobs'));
        router.refresh();
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
            `/employer/jobs/${(data as { id: string }).id}/edit`,
          ),
        );
        return;
      }
      if (opts.mode !== 'edit') {
        router.refresh();
      }
    },
  });

  const patchChainRef = React.useRef(Promise.resolve());

  const mutate = React.useCallback(
    (body: EmployerJobDraftBody, callbacks?: MutateOpts) => {
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
