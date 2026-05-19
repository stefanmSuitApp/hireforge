'use client';

import { useLocale, useTranslations } from 'next-intl';

import { AuthFormGateway } from '@/components/auth-form-gateway';
import { AuthPublicGradientShell } from '@/components/auth-public-gradient-shell';
import { Button } from '@/components/ui';
import { Link } from '@/i18n/navigation';

import { EmployerLoginForm } from './employer-login-form';

type Props = { returnTo?: string | null };

/** Employer login route: copy, links, and auth form (business UI). */
export function EmployerLoginScreen({ returnTo }: Props) {
  const t = useTranslations('Employer');
  const locale = useLocale();

  return (
    <AuthPublicGradientShell
      className="bg-gradient-to-b from-background to-background"
      contentClassName="py-12"
    >
      <AuthFormGateway
        eyebrowText={t('workspaceLabel')}
        title={t('loginTitle')}
        subtitle={t('loginSubtitle')}
        panelClassName="border-border/70 bg-card"
        footer={
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t('noAccount')}{' '}
            <Button variant="link" className="h-auto p-0 text-primary" asChild>
              <Link href="/employer/register" locale={locale}>
                {t('registerLink')}
              </Link>
            </Button>
          </p>
        }
      >
        <EmployerLoginForm returnTo={returnTo} />
      </AuthFormGateway>
    </AuthPublicGradientShell>
  );
}
