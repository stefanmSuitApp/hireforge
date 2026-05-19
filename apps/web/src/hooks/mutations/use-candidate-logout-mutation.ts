'use client';

import { useMutation } from '@tanstack/react-query';

import { useRouter } from '@/i18n/navigation';

import { postCandidateLogout } from '@/api/candidate-auth';

export function useCandidateLogoutMutation() {
  const router = useRouter();
  return useMutation({
    mutationFn: () => postCandidateLogout(),
    onSuccess: () => {
      router.replace('/candidate/login');
    },
  });
}
