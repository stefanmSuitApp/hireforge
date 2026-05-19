'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from '@/i18n/navigation';

import { postEmployerLogout } from '@/api/employer-auth';

export function useEmployerLogoutMutation() {
  const router = useRouter();
  return useMutation({
    mutationFn: () => postEmployerLogout(),
    onSuccess: () => {
      router.replace('/employer/login');
    },
  });
}
