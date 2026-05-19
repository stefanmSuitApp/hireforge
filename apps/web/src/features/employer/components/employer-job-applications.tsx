import { getLocale, getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

import { EmployerJobApplicationsSection } from './employer-job-applications-section';

type Props = {
  jobId: string;
};

export async function EmployerJobApplications({ jobId }: Props) {
  const locale = await getLocale();
  const t = await getTranslations('Employer.applications');

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <div className="flex flex-row flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-foreground">{t('title')}</h2>
          <Button variant="outline" size="sm" asChild>
            <Link href="/employer/jobs" locale={locale}>
              {t('backToList')}
            </Link>
          </Button>
        </div>
      </section>
      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <EmployerJobApplicationsSection jobId={jobId} />
      </section>
    </div>
  );
}
