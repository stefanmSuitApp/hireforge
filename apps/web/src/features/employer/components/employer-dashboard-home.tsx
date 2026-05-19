import { getLocale, getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import type { EmployerWorkspacePayload } from '@/lib/fetch-employer-workspace';
import { resolveEmployerAddListingHref } from '@/lib/employer-add-listing-href';
import { Link } from '@/i18n/navigation';

type Props = { workspace: EmployerWorkspacePayload };

export async function EmployerDashboardHome({ workspace }: Props) {
  const locale = await getLocale();
  const t = await getTranslations('Employer');
  const th = await getTranslations('Employer.home');
  const mod = workspace.assignedModerator;
  const addListingHref = resolveEmployerAddListingHref(workspace);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground">{t('dashboardTitle')}</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t('dashboardBody')}</p>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {t('dashboardPackagesHint')}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild className="h-auto justify-center py-3">
            <Link href={addListingHref} locale={locale}>
              {t('workspaceNavAddListing')}
            </Link>
          </Button>
          <Button variant="outline" asChild className="h-auto justify-center py-3">
            <Link href="/employer/jobs" locale={locale}>
              {th('ctaListings')}
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-border/70 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {th('cardListingsLabel')}
          </p>
          <p className="mt-2 text-sm text-foreground">{th('cardListingsBody')}</p>
        </article>
        <article className="rounded-xl border border-border/70 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {th('cardPackagesLabel')}
          </p>
          <p className="mt-2 text-sm text-foreground">{th('cardPackagesBody')}</p>
        </article>
        <article className="rounded-xl border border-border/70 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {th('cardPublicLabel')}
          </p>
          <p className="mt-2 text-sm text-foreground">{th('cardPublicBody')}</p>
        </article>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <h3 className="text-base font-semibold text-foreground">{t('contactCard.title')}</h3>
        <div className="mt-4 space-y-2 text-sm">
          {mod ? (
            <>
              {mod.displayName ? (
                <p>
                  <span className="text-muted-foreground">{t('contactCard.name')}</span>{' '}
                  {mod.displayName}
                </p>
              ) : null}
              <p>
                <span className="text-muted-foreground">{t('contactCard.email')}</span>{' '}
                <a className="text-primary underline" href={`mailto:${mod.email}`}>
                  {mod.email}
                </a>
              </p>
              {mod.phone ? (
                <p>
                  <span className="text-muted-foreground">{t('contactCard.phone')}</span>{' '}
                  <a className="text-primary underline" href={`tel:${mod.phone}`}>
                    {mod.phone}
                  </a>
                </p>
              ) : null}
              {!mod.displayName && !mod.phone ? (
                <p className="text-muted-foreground">{t('contactCard.partial')}</p>
              ) : null}
            </>
          ) : (
            <p className="text-muted-foreground">{t('contactCard.unassigned')}</p>
          )}
        </div>
      </section>
    </div>
  );
}
