'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from '@/i18n/navigation';

import {
  postEmployerRegister,
  type EmployerRegisterBody,
} from '@/api/employer-auth';

export function useEmployerRegisterMutation() {
  const router = useRouter();
  return useMutation({
    mutationFn: (body: EmployerRegisterBody) => postEmployerRegister(body),
    onSuccess: () => {
      router.replace('/employer');
    },
  });
}
