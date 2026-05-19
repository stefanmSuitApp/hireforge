import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export default async function AdminHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Admin.home');

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground">
          {t('heading')}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {t('lead')}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild className="h-auto justify-center py-3">
            <Link href="/admin/users" locale={locale}>
              {t('linkUsers')}
            </Link>
          </Button>
          <Button variant="outline" asChild className="h-auto justify-center py-3">
            <Link href="/admin/audit" locale={locale}>
              {t('linkAudit')}
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { href: '/admin/taxonomy', label: t('linkTaxonomy'), body: t('cardTaxonomyBody') },
          { href: '/admin/companies', label: t('linkCompanies'), body: t('cardCompaniesBody') },
          {
            href: '/admin/billing/enterprise-pending',
            label: t('linkBillingEnterprise'),
            body: t('cardBillingBody'),
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            locale={locale}
            className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-colors hover:bg-muted/40"
          >
            <p className="text-sm font-semibold text-foreground">
              {item.label}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
