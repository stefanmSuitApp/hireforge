import { headers } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { AuthFormGateway } from '@/components/auth-form-gateway';
import { AuthPublicGradientShell } from '@/components/auth-public-gradient-shell';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { forwardClientIpHeaders } from '@/lib/client-ip';
import { nestApiUrl, resolveNestServerOrigin } from '@/lib/nest-api-url';

export const dynamic = 'force-dynamic';

/** Confirms the emailed token server-side; verifying twice or via a link scanner is harmless. */
async function confirmToken(token: string): Promise<boolean> {
  const url = nestApiUrl(resolveNestServerOrigin() ?? '', 'auth/verify-email');
  if (!url) {
    return false;
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...forwardClientIpHeaders(await headers()),
      },
      body: JSON.stringify({ token }),
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export default async function VerifyEmailPage({
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

  const ok = token ? await confirmToken(token) : false;

  return (
    <AuthPublicGradientShell
      className="bg-gradient-to-b from-background to-background"
      contentClassName="py-12"
    >
      <AuthFormGateway
        eyebrowText={t('eyebrow')}
        title={ok ? t('verifiedTitle') : t('verifyFailedTitle')}
        panelWidth="md"
        panelClassName="border-border/70 bg-card"
      >
        <div className="flex flex-col gap-4 text-sm">
          <p className="m-0 text-muted-foreground">
            {ok ? t('verifiedBody') : t('verifyFailedBody')}
          </p>
          <Button asChild className="h-11 rounded-full">
            <Link href="/sign-in">{t('goToSignIn')}</Link>
          </Button>
        </div>
      </AuthFormGateway>
    </AuthPublicGradientShell>
  );
}
