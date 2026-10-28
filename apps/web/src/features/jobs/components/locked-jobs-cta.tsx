import { Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

type Props = {
  /** Jobs a guest sees only as teasers (or not at all). */
  count: number;
  locale: string;
  /** Locale-less path to come back to after sign-in. */
  returnToPath: string;
  className?: string;
};

/** Guests: featured jobs are public, the rest open after sign-in. */
export function LockedJobsCta({
  count,
  locale,
  returnToPath,
  className,
}: Props) {
  const t = useTranslations('Jobs');
  if (count < 1) return null;
  const returnTo = encodeURIComponent(`/${locale}${returnToPath}`);
  return (
    <aside
      className={cn(
        'flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Lock className="size-5" aria-hidden />
        </span>
        <div>
          <p className="m-0 font-semibold text-foreground">
            {t('lockedMoreTitle', { count })}
          </p>
          <p className="m-0 mt-0.5 text-sm text-muted-foreground">
            {t('lockedMoreBody')}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Link
          href={`/sign-in?returnTo=${returnTo}`}
          locale={locale}
          className={buttonVariants({ size: 'sm' })}
        >
          {t('lockedSignIn')}
        </Link>
        <Link
          href={`/candidate/register?returnTo=${returnTo}`}
          locale={locale}
          className={buttonVariants({ size: 'sm', variant: 'outline' })}
        >
          {t('lockedRegister')}
        </Link>
      </div>
    </aside>
  );
}
