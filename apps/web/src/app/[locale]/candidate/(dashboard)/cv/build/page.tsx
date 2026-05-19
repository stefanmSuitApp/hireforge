import { getTranslations, setRequestLocale } from 'next-intl/server';

import { CandidateCvBuildWizard } from '@/features/candidate';
import { fetchCvTemplates } from '@/lib/cms-content';
import { loadCandidateSessionOrRedirect } from '@/lib/candidate-workspace-load';
import { fetchPublicJobTaxonomy } from '@/lib/public-jobs';
import { resolveNestPublicOrigin } from '@/lib/nest-api-url';

export default async function CandidateCvBuildPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Candidate.cvBuild');

  const session = await loadCandidateSessionOrRedirect();
  const apiBase = resolveNestPublicOrigin() ?? '';
  const taxonomy = await fetchPublicJobTaxonomy(apiBase);
  const cmsTemplates = await fetchCvTemplates(locale);

  if (!taxonomy.ok) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground">{t('title')}</h2>
        <p className="mt-2 text-sm text-destructive">{t('taxonomyError')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground">{t('title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('lead')}</p>
      </section>
      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <CandidateCvBuildWizard
          locale={locale}
          initial={session.me.candidate}
          cityGroups={taxonomy.data.cityGroups}
          flatCities={taxonomy.data.cities}
          cmsTemplates={cmsTemplates}
        />
      </section>
    </div>
  );
}
