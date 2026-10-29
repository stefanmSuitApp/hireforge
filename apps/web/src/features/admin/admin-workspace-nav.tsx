'use client';

import { useTranslations } from 'next-intl';

import { ModeratorWorkspaceNav } from '@/features/moderator/components/moderator-workspace-nav';

export function AdminWorkspaceNav() {
  const tAdmin = useTranslations('Admin');
  return (
    <ModeratorWorkspaceNav staffRole="admin" ariaLabel={tAdmin('navAria')} />
  );
}
