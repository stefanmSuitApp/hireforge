'use client';

import { useQuery } from '@tanstack/react-query';
import type {
  ModeratorJobDetailResponse,
  ModeratorJobQueueResponse,
} from 'contracts';

import { getModeratorJob, getModeratorQueue } from '@/api/moderator-client';

export const moderatorQueryKeys = {
  all: ['moderator'] as const,
  queue: (status: string) => ['moderator', 'queue', status] as const,
  job: (jobId: string) => ['moderator', 'job', jobId] as const,
};

export function useModeratorQueueQuery(
  status: string,
  initialData: ModeratorJobQueueResponse,
) {
  return useQuery({
    queryKey: moderatorQueryKeys.queue(status),
    queryFn: () => getModeratorQueue(status),
    initialData,
  });
}

export function useModeratorJobQuery(
  jobId: string,
  initialData: ModeratorJobDetailResponse,
) {
  return useQuery({
    queryKey: moderatorQueryKeys.job(jobId),
    queryFn: () => getModeratorJob(jobId),
    initialData,
  });
}
