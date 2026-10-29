import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import type { AuthRole } from '@/lib/unified-auth';

export type LaunchViewer = AuthRole | null;

/**
 * Shown while the whole site has no live job: says so plainly (instead of
 * "change your filters") and gives each visitor a next step. Employers
 * first, since nothing happens until someone posts.
 */
export function SiteLaunchPanel({
  viewer,
  variant,
}: {
  viewer: LaunchViewer;
  variant: 'jobs' | 'home';
}) {
  const t = useTranslations('Launch');
  const candidate = viewer === 'candidate';
  const staff = viewer === 'moderator' || viewer === 'admin';

  return (
    <section
      aria-labelledby={`launch-${variant}`}
      className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-6 py-10 text-center md:px-10"
    >
      <h2
        id={`launch-${variant}`}
        className="m-0 mb-2 text-xl font-semibold text-foreground"
      >
        {variant === 'home' ? t('homeTitle') : t('title')}
      </h2>
      <p className="m-0 mx-auto max-w-xl text-[0.9375rem] leading-relaxed text-muted-foreground">
        {candidate
          ? t('bodyCandidate')
          : variant === 'home'
            ? t('homeBody')
            : t('body')}
      </p>
      {staff ? null : (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {candidate ? (
            <Button asChild>
              <Link href="/candidate/profile">{t('prepareCv')}</Link>
            </Button>
          ) : (
            <>
              <Button asChild>
                <Link
                  href={
                    viewer === 'employer' ? '/employer' : '/employer/register'
                  }
                >
                  {t('postFirstJob')}
                </Link>
              </Button>
              {viewer === null ? (
                <Button variant="outline" asChild>
                  <Link href="/candidate/register">
                    {t('registerCandidate')}
                  </Link>
                </Button>
              ) : null}
            </>
          )}
        </div>
      )}
    </section>
  );
}
