import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { StaffNestFetchError } from '@/components/staff-nest-fetch-error';
import {
  ModeratorCompanyDetailForm,
  ModeratorCompanySalesActions,
} from '@/features/moderator';
import { fetchStaffCompanyDetail } from '@/lib/fetch-staff';
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
  const detail = await fetchStaffCompanyDetail(session.accessToken, companyId);
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

      <ModeratorCompanySalesActions
        company={detail.data}
        currentUserId={session.me.user.id}
      />

      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <h3 className="text-base font-semibold text-foreground">
          {t('membersHeading')}
        </h3>
        {detail.data.employers.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {t('noMembers')}
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border rounded-xl border border-border/70">
            {detail.data.employers.map((m) => (
              <li key={m.employerId} className="px-3 py-2 text-sm">
                <span className="font-mono">{m.email}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

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
