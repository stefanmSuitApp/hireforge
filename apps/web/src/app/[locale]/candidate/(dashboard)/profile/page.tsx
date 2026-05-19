import { getTranslations, setRequestLocale } from 'next-intl/server';

import { CandidateProfilePanel } from '@/features/candidate';
import { fetchCandidateResumes } from '@/lib/fetch-candidate-resumes';
import { loadCandidateSessionOrRedirect } from '@/lib/candidate-workspace-load';

export default async function CandidateProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Candidate.profile');

  const session = await loadCandidateSessionOrRedirect();
  const resumes = await fetchCandidateResumes(session.accessToken);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground">{t('heading')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('subheading')}</p>
      </section>
      <CandidateProfilePanel
        initialFullName={session.me.candidate.fullName}
        resumes={resumes.ok ? resumes.data : []}
        resumesError={!resumes.ok}
      />
    </div>
  );
}
