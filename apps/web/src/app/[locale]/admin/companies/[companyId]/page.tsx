import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { StaffNestFetchError } from '@/components/staff-nest-fetch-error';
import { AdminCompanyReassignPanel } from '@/features/admin';
import { Link } from '@/i18n/navigation';
import { loadAdminSessionOrRedirect } from '@/lib/admin-workspace-load';
import {
  fetchAdminCompanyAssignmentHistory,
  fetchStaffCompanyDetail,
} from '@/lib/fetch-staff';
import { redirectToModeratorLoginIfUnauthorized } from '@/lib/staff-server-fetch-guard';

export default async function AdminCompanyDetailPage({
  params,
}: {
  params: Promise<{ locale: string; companyId: string }>;
}) {
  const { locale, companyId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Admin.companies');

  const session = await loadAdminSessionOrRedirect();
  const [detail, history] = await Promise.all([
    fetchStaffCompanyDetail(session.accessToken, companyId),
    fetchAdminCompanyAssignmentHistory(session.accessToken, companyId),
  ]);

  if (!detail.ok) {
    if (detail.status === 404) {
      redirect(`/${locale}/admin/companies`);
    }
    if (detail.status === 401 || detail.status === 403) {
      redirect(`/${locale}/moderator/login`);
    }
    redirectToModeratorLoginIfUnauthorized(locale, detail.status);
    return <StaffNestFetchError status={detail.status} />;
  }

  if (!history.ok) {
    redirectToModeratorLoginIfUnauthorized(locale, history.status);
    return <StaffNestFetchError status={history.status} />;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <Link
          href="/admin/companies"
          locale={locale}
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          {t('backToList')}
        </Link>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          {t('detailHeading')}: {detail.data.legalName}
        </h2>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          {detail.data.slug}
        </p>
        <p className="mt-2 text-sm text-foreground">
          <span className="text-muted-foreground">
            {t('detailSalesOwner')}:{' '}
          </span>
          <span className="font-mono text-xs">
            {detail.data.assignedModeratorEmail ??
              detail.data.assignedModeratorId ??
              t('detailSalesOwnerNone')}
          </span>
        </p>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <AdminCompanyReassignPanel
          companyId={companyId}
          initialHistory={history.data}
        />
      </section>
    </div>
  );
}
