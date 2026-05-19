import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { StaffNestFetchError } from '@/components/staff-nest-fetch-error';
import {
  staffSalesStatusTone,
  TableStatusBadge,
} from '@/components/table-status-badge';
import { Link } from '@/i18n/navigation';
import { loadAdminSessionOrRedirect } from '@/lib/admin-workspace-load';
import { fetchStaffCompanyList } from '@/lib/fetch-staff';
import { redirectToModeratorLoginIfUnauthorized } from '@/lib/staff-server-fetch-guard';

export default async function AdminCompaniesListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Admin.companies');

  const session = await loadAdminSessionOrRedirect();
  const list = await fetchStaffCompanyList(
    session.accessToken,
    'view=all&limit=200&offset=0',
  );

  if (!list.ok) {
    if (list.status === 401 || list.status === 403) {
      redirect(`/${locale}/moderator/login`);
    }
    redirectToModeratorLoginIfUnauthorized(locale, list.status);
    return <StaffNestFetchError status={list.status} />;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground">
          {t('listHeading')}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('listHint')}</p>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        {list.data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('listEmpty')}</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border/70">
            {list.data.items.map((c) => (
              <li
                key={c.id}
                className="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <Link
                    href={`/admin/companies/${c.id}`}
                    locale={locale}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {c.legalName}
                  </Link>
                  <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                    {c.slug}
                  </p>
                </div>
                <TableStatusBadge
                  label={t(`salesStatus.${c.salesStatus}`)}
                  tone={staffSalesStatusTone(c.salesStatus)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
