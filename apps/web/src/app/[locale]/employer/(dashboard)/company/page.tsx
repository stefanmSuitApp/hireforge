import { setRequestLocale } from 'next-intl/server';

import { PublicCompanyPage } from '@/features/companies/components/public-company-page';
import { loadEmployerWorkspaceOrRedirect } from '@/lib/employer-workspace-load';

export default async function EmployerCompanyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const workspace = await loadEmployerWorkspaceOrRedirect();

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <PublicCompanyPage locale={locale} slug={workspace.company.slug} />
      </section>
    </div>
  );
}
