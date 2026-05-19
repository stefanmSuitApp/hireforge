import { getTranslations } from 'next-intl/server';

import { AuthFormGateway } from '@/components/auth-form-gateway';
import { AuthPublicGradientShell } from '@/components/auth-public-gradient-shell';
import { Link } from '@/i18n/navigation';

import { CandidateLoginForm } from './candidate-login-form';

type Props = { returnTo?: string | null };

export async function CandidateLoginScreen({ returnTo }: Props) {
  const t = await getTranslations('Candidate');

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
            <Link
              href="/candidate/register"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {t('registerLink')}
            </Link>
          </p>
        }
      >
        <CandidateLoginForm returnTo={returnTo} />
      </AuthFormGateway>
    </AuthPublicGradientShell>
  );
}
