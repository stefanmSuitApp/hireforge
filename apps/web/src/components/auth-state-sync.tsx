'use client';

import { useEffect } from 'react';

import { useRouter } from '@/i18n/navigation';

/**
 * Forces a fresh server payload after auth redirects so header/session UI
 * immediately reflects the latest cookie state (e.g. expired session logout).
 */
export function AuthStateSync() {
  const router = useRouter();

  useEffect(() => {
    router.refresh();
  }, [router]);

  return null;
}
