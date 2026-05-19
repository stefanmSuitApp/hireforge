'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from '@/i18n/navigation';

import { postModeratorLogin } from '@/api/moderator-client';

export function useModeratorLoginMutation() {
  const router = useRouter();
  return useMutation({
    mutationFn: postModeratorLogin,
    onSuccess: () => {
      router.replace('/moderator');
    },
  });
}
