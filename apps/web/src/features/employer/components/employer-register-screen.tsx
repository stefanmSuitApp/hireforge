'use client';

import { useLocale, useTranslations } from 'next-intl';

import { AuthFormGateway } from '@/components/auth-form-gateway';
import { AuthPublicGradientShell } from '@/components/auth-public-gradient-shell';
import { Button } from '@/components/ui';
import { Link } from '@/i18n/navigation';

import { EmployerRegisterForm } from './employer-register-form';

/** Employer registration route: copy, links, and signup form (business UI). */
export function EmployerRegisterScreen() {
  const t = useTranslations('Employer');
  const locale = useLocale();

  return (
    <AuthPublicGradientShell
      className="bg-gradient-to-b from-background to-background"
      contentClassName="py-12"
    >
      <AuthFormGateway
        eyebrowText={t('workspaceLabel')}
        title={t('registerTitle')}
        subtitle={t('registerSubtitle')}
        panelWidth="2xl"
        panelClassName="border-border/70 bg-card"
        footer={
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t('haveAccount')}{' '}
            <Button variant="link" className="h-auto p-0 text-primary" asChild>
              <Link href="/employer/login" locale={locale}>
                {t('loginLink')}
              </Link>
            </Button>
          </p>
        }
      >
        <EmployerRegisterForm />
      </AuthFormGateway>
    </AuthPublicGradientShell>
  );
}
