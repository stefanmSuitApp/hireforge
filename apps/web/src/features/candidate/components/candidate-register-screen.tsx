import { getTranslations } from 'next-intl/server';

import { AuthFormGateway } from '@/components/auth-form-gateway';
import { AuthPublicGradientShell } from '@/components/auth-public-gradient-shell';
import { Link } from '@/i18n/navigation';

import { CandidateRegisterForm } from './candidate-register-form';

export async function CandidateRegisterScreen() {
  const t = await getTranslations('Candidate');

  return (
    <AuthPublicGradientShell
      className="bg-gradient-to-b from-background to-background"
      contentClassName="py-12"
    >
      <AuthFormGateway
        eyebrowText={t('workspaceLabel')}
        title={t('registerTitle')}
        subtitle={t('registerSubtitle')}
        panelClassName="border-border/70 bg-card"
        footer={
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t('hasAccount')}{' '}
            <Link
              href="/candidate/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {t('signInLink')}
            </Link>
          </p>
        }
      >
        <CandidateRegisterForm />
      </AuthFormGateway>
    </AuthPublicGradientShell>
  );
}
