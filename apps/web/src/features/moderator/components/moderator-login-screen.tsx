'use client';

import { useTranslations } from 'next-intl';

import { AuthFormGateway } from '@/components/auth-form-gateway';
import { AuthPublicGradientShell } from '@/components/auth-public-gradient-shell';

import { ModeratorLoginForm } from './moderator-login-form';

export function ModeratorLoginScreen() {
  const t = useTranslations('Moderator');

  return (
    <AuthPublicGradientShell>
      <AuthFormGateway
        eyebrowText={t('workspaceLabel')}
        title={t('loginTitle')}
        subtitle={t('loginSubtitle')}
      >
        <ModeratorLoginForm />
      </AuthFormGateway>
    </AuthPublicGradientShell>
  );
}
