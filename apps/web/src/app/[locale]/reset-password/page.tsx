import { getTranslations, setRequestLocale } from 'next-intl/server';

import { AuthFormGateway } from '@/components/auth-form-gateway';
import { AuthPublicGradientShell } from '@/components/auth-public-gradient-shell';
import { Button } from '@/components/ui/button';
import { ResetPasswordForm } from '@/features/auth';
import { Link } from '@/i18n/navigation';

export default async function ResetPasswordPage({
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
        title={t('resetTitle')}
        panelWidth="md"
        panelClassName="border-border/70 bg-card"
      >
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="flex flex-col gap-4 text-sm">
            <p className="m-0 text-muted-foreground">{t('linkMissing')}</p>
            <Button asChild variant="outline" className="h-11 rounded-full">
              <Link href="/forgot-password">{t('requestNewLink')}</Link>
            </Button>
          </div>
        )}
      </AuthFormGateway>
    </AuthPublicGradientShell>
  );
}
