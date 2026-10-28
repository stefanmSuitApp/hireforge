import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { AuthFormGateway } from '@/components/auth-form-gateway';
import { AuthPublicGradientShell } from '@/components/auth-public-gradient-shell';
import { EmployerLogoutButton } from '@/features/employer';
import { EMPLOYER_ACCESS_COOKIE } from '@/lib/employer-session';
import { fetchEmployerJoinRequest } from '@/lib/fetch-employer-join-request';

/** Shown to employers whose signup matched an existing company until staff decide. */
export default async function EmployerPendingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Employer.joinRequest');

  const access = (await cookies()).get(EMPLOYER_ACCESS_COOKIE)?.value;
  if (!access) {
    redirect(`/${locale}/employer/login`);
  }
  const request = await fetchEmployerJoinRequest(access);
  if (!request || request.status === 'approved') {
    redirect(`/${locale}/employer`);
  }

  const rejected = request.status === 'rejected';

  return (
    <AuthPublicGradientShell
      className="bg-gradient-to-b from-background to-background"
      contentClassName="py-12"
    >
      <AuthFormGateway
        eyebrowText={t('eyebrow')}
        title={rejected ? t('rejectedTitle') : t('pendingTitle')}
        panelWidth="md"
        panelClassName="border-border/70 bg-card"
      >
        <div className="flex flex-col gap-4 text-sm text-muted-foreground">
          <p className="m-0">
            {t('companyLabel')}{' '}
            <strong className="text-foreground">
              {request.companyLegalName}
            </strong>
          </p>
          <p className="m-0">
            {rejected ? t('rejectedBody') : t('pendingBody')}
          </p>
          <EmployerLogoutButton />
        </div>
      </AuthFormGateway>
    </AuthPublicGradientShell>
  );
}
