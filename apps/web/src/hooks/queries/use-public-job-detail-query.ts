'use client';

import { useQuery } from '@tanstack/react-query';

import type { PublicJobDetailResponse } from 'contracts';

export class PublicJobDetailQueryError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'PublicJobDetailQueryError';
  }
}

export function publicJobDetailQueryKey(jobRef: string) {
  return ['public-job-detail', jobRef] as const;
}

type Options = {
  jobRef: string;
  enabled: boolean;
};

/**
 * Loads public job detail via same-origin Next API proxy (avoids browser CORS to Nest).
 */
export function usePublicJobDetailQuery({ jobRef, enabled }: Options) {
  return useQuery({
    queryKey: publicJobDetailQueryKey(jobRef),
    queryFn: async (): Promise<PublicJobDetailResponse> => {
      const ref = jobRef.trim();
      const res = await fetch(
        `/api/public/jobs/detail/${encodeURIComponent(ref)}`,
        { headers: { Accept: 'application/json' } },
      );
      if (!res.ok) {
        let message = `HTTP ${res.status}`;
        try {
          const errBody = (await res.json()) as { error?: string };
          if (typeof errBody?.error === 'string') message = errBody.error;
        } catch {
          /* use generic message */
        }
        throw new PublicJobDetailQueryError(message, res.status);
      }
      return res.json() as Promise<PublicJobDetailResponse>;
    },
    enabled: enabled && Boolean(jobRef.trim()),
    staleTime: 60_000,
  });
}
