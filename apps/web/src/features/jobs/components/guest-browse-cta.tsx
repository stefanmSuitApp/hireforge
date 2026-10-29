import { Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
        'hf-reveal flex flex-col gap-4 rounded-[22px] bg-primary p-6 text-primary-foreground sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15">
          <Lock className="size-5" aria-hidden />
        </span>
        <div>
          <p className="m-0 text-lg font-extrabold">
            {title ?? t('guestBrowseTitle', { count: total })}
          </p>
          <p className="m-0 mt-1 text-sm opacity-85">{t('guestBrowseBody')}</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Link
          href={`/candidate/register?returnTo=${returnTo}`}
          locale={locale}
          className="hf-press inline-flex min-h-11 items-center rounded-full bg-primary-foreground px-5 text-sm font-bold text-primary no-underline"
        >
          {t('guestRegister')}
        </Link>
        <Link
          href={`/sign-in?returnTo=${returnTo}`}
          locale={locale}
          className="hf-press inline-flex min-h-11 items-center rounded-full border border-primary-foreground/50 px-5 text-sm font-bold text-primary-foreground no-underline"
        >
          {t('guestSignIn')}
        </Link>
      </div>
    </aside>
  );
}
