import { Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

type Props = {
  /** All matching jobs (a guest sees the first 20). */
  total: number;
  locale: string;
  /** Locale-less path (with query) to come back to after sign-in. */
  returnToPath: string;
  /** Override the default "see all N jobs" heading (e.g. for filters). */
  title?: string;
  className?: string;
};

/** Guests browse the first page only; this is the way to the rest. */
export function GuestBrowseCta({
  total,
  locale,
  returnToPath,
  title,
  className,
}: Props) {
  const t = useTranslations('Jobs');
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
            {title ?? t('guestBrowseTitle', { count: total })}
          </p>
          <p className="m-0 mt-0.5 text-sm text-muted-foreground">
            {t('guestBrowseBody')}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Link
          href={`/sign-in?returnTo=${returnTo}`}
          locale={locale}
          className={buttonVariants({ size: 'sm' })}
        >
          {t('guestSignIn')}
        </Link>
        <Link
          href={`/candidate/register?returnTo=${returnTo}`}
          locale={locale}
          className={buttonVariants({ size: 'sm', variant: 'outline' })}
        >
          {t('guestRegister')}
        </Link>
      </div>
    </aside>
  );
}
