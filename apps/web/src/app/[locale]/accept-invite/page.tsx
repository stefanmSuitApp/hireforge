import { getTranslations, setRequestLocale } from 'next-intl/server';

import { AuthFormGateway } from '@/components/auth-form-gateway';
import { AuthPublicGradientShell } from '@/components/auth-public-gradient-shell';
import { ResetPasswordForm } from '@/features/auth';

/** Link from the invite email (or shared by staff) for a staff-created employer account. */
export default async function AcceptInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  const { token } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('AccountEmail');

  return (
    <AuthPublicGradientShell
      className="bg-gradient-to-b from-background to-background"
      contentClassName="py-12"
    >
      <AuthFormGateway
        eyebrowText={t('eyebrow')}
        title={t('inviteTitle')}
        subtitle={t('inviteSubtitle')}
        panelWidth="md"
        panelClassName="border-border/70 bg-card"
      >
        {token ? (
          <ResetPasswordForm token={token} mode="invite" />
        ) : (
          <p className="m-0 text-sm text-muted-foreground">
            {t('inviteLinkMissing')}
          </p>
        )}
      </AuthFormGateway>
    </AuthPublicGradientShell>
  );
}
