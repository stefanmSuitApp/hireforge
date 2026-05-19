'use client';

import { useMutation } from '@tanstack/react-query';

import { useRouter } from '@/i18n/navigation';

import {
  postCandidateRegister,
  type CandidateRegisterBody,
} from '@/api/candidate-auth';

export function useCandidateRegisterMutation() {
  const router = useRouter();
  return useMutation({
    mutationFn: (body: CandidateRegisterBody) => postCandidateRegister(body),
    onSuccess: () => {
      router.replace('/candidate');
    },
  });
}
