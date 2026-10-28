import { getTranslations, setRequestLocale } from 'next-intl/server';

import { AuthFormGateway } from '@/components/auth-form-gateway';
import { AuthPublicGradientShell } from '@/components/auth-public-gradient-shell';
import { ForgotPasswordForm } from '@/features/auth';

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('AccountEmail');

  return (
    <AuthPublicGradientShell
      className="bg-gradient-to-b from-background to-background"
      contentClassName="py-12"
    >
      <AuthFormGateway
        eyebrowText={t('eyebrow')}
        title={t('forgotTitle')}
        subtitle={t('forgotSubtitle')}
        panelWidth="md"
        panelClassName="border-border/70 bg-card"
      >
        <ForgotPasswordForm />
      </AuthFormGateway>
    </AuthPublicGradientShell>
  );
}
