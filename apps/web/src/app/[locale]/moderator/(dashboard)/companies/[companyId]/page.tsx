import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { StaffNestFetchError } from '@/components/staff-nest-fetch-error';
import { AdminCompanyReassignPanel } from '@/features/admin';
import {
  ModeratorCompanyAccounts,
  ModeratorCompanyDetailForm,
  ModeratorCompanyLogo,
  ModeratorCompanySalesActions,
} from '@/features/moderator';
import {
  fetchAdminCompanyAssignmentHistory,
  fetchStaffCompanyDetail,
} from '@/lib/fetch-staff';
import { Link } from '@/i18n/navigation';
import { loadModeratorSessionOrRedirect } from '@/lib/moderator-workspace-load';
import { redirectToModeratorLoginIfUnauthorized } from '@/lib/staff-server-fetch-guard';

export default async function ModeratorCompanyDetailPage({
  params,
}: {
  params: Promise<{ locale: string; companyId: string }>;
}) {
  const { locale, companyId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Moderator.companies');

  const session = await loadModeratorSessionOrRedirect();
  const isAdmin = session.me.user.role === 'admin';
  const [detail, history] = await Promise.all([
    fetchStaffCompanyDetail(session.accessToken, companyId),
    isAdmin
      ? fetchAdminCompanyAssignmentHistory(session.accessToken, companyId)
      : null,
  ]);
  if (!detail.ok) {
    if (detail.status === 404) {
      redirect(`/${locale}/moderator/companies`);
    }
    redirectToModeratorLoginIfUnauthorized(locale, detail.status);
    return <StaffNestFetchError status={detail.status} />;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {detail.data.legalName}
            </h2>
            <p className="mt-1 font-mono text-sm text-muted-foreground">
              {detail.data.slug}
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link
              href={`/moderator/jobs/new?companyId=${companyId}`}
              locale={locale}
            >
              {t('createListing')}
            </Link>
          </Button>
        </div>
      </section>

      <ModeratorCompanyLogo
        companyId={companyId}
        logoUrl={detail.data.logoUrl}
      />

      <ModeratorCompanySalesActions
        company={detail.data}
        currentUserId={session.me.user.id}
      />

      {history?.ok ? (
        <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
          <AdminCompanyReassignPanel
            companyId={companyId}
            initialHistory={history.data}
          />
        </section>
      ) : null}

      <ModeratorCompanyAccounts
        companyId={companyId}
        members={detail.data.employers}
      />

      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <h3 className="text-base font-semibold text-foreground">
          {t('editHeading')}
        </h3>
        <div className="mt-4">
          <ModeratorCompanyDetailForm company={detail.data} />
        </div>
      </section>
    </div>
  );
}
