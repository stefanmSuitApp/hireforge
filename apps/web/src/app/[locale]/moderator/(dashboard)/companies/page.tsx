import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { ModeratorCompaniesSection } from '@/features/moderator';
import { loadModeratorSessionOrRedirect } from '@/lib/moderator-workspace-load';

export default async function ModeratorCompaniesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Moderator.companies');

  const session = await loadModeratorSessionOrRedirect();

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {t('heading')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('companiesLead')}
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/moderator/companies/new" locale={locale}>
              {t('newCompany')}
            </Link>
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <ModeratorCompaniesSection
          locale={locale}
          staffRole={session.me.user.role}
        />
      </section>
    </div>
  );
}
