'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { useCandidateLogoutMutation } from '@/hooks/mutations';

export function CandidateLogoutButton() {
  const t = useTranslations('Candidate');
  const logout = useCandidateLogoutMutation();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={logout.isPending}
      onClick={() => logout.mutate()}
    >
      {logout.isPending ? t('signingOut') : t('signOut')}
    </Button>
  );
}
