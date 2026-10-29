import { Rocket } from 'lucide-react';
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
      className="hf-reveal @container relative overflow-hidden rounded-[28px] border border-border bg-card px-6 py-9 sm:px-10 sm:py-10"
    >
      {/* Decor only: a soft gold disc behind the corner. */}
      <div
        aria-hidden
        className="absolute -right-16 -top-16 size-56 rounded-full bg-featured-soft"
      />
      {/* Sized by its own width, not the viewport: on /jobs it sits in a
          narrower column than on home. */}
      <div className="relative flex flex-col gap-6 @3xl:flex-row @3xl:items-center">
        <span
          aria-hidden
          className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-featured text-featured-foreground"
        >
          <Rocket className="size-7" />
        </span>
        <div className="flex-1">
          <h2
            id={`launch-${variant}`}
            className="m-0 text-2xl font-extrabold tracking-tight text-foreground md:text-[1.75rem]"
          >
            {variant === 'home' ? t('homeTitle') : t('title')}
          </h2>
          <p className="m-0 mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {candidate
              ? t('bodyCandidate')
              : variant === 'home'
                ? t('homeBody')
                : t('body')}
          </p>
        </div>
        {staff ? null : (
          <div className="flex flex-wrap gap-3 @3xl:justify-end">
            {candidate ? (
              <Button asChild className="hf-press min-h-12 rounded-full px-6">
                <Link href="/candidate/profile">{t('prepareCv')}</Link>
              </Button>
            ) : (
              <>
                <Button
                  asChild
                  className="hf-press min-h-12 rounded-full px-6 font-bold"
                >
                  <Link
                    href={
                      viewer === 'employer' ? '/employer' : '/employer/register'
                    }
                  >
                    {t('postFirstJob')}
                  </Link>
                </Button>
                {viewer === null ? (
                  <Button
                    variant="outline"
                    asChild
                    className="hf-press min-h-12 rounded-full px-6"
                  >
                    <Link href="/candidate/register">
                      {t('registerCandidate')}
                    </Link>
                  </Button>
                ) : null}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
