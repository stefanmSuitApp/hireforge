'use client';

import * as React from 'react';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { RECENT_JOBS_EVENT } from '@/lib/recently-viewed-jobs';
import {
  retireSignUpBar,
  signUpBarDue,
  signUpBarPlacement,
} from '@/lib/sign-up-bar';

/** After a guest's 3rd job page: a small, dismissible nudge to sign up. */
export function GuestSignUpBar({ guest }: { guest: boolean }) {
  const t = useTranslations('SignUpBar');
  const pathname = usePathname();
  const [due, setDue] = React.useState(false);

  React.useEffect(() => {
    if (!guest) {
      retireSignUpBar();
      return;
    }
    const check = () => setDue(signUpBarDue());
    check();
    globalThis.addEventListener(RECENT_JOBS_EVENT, check);
    return () => globalThis.removeEventListener(RECENT_JOBS_EVENT, check);
  }, [guest]);

  const placement = signUpBarPlacement(pathname);
  if (!guest || !due || placement === 'none') return null;

  return (
    <aside
      aria-label={t('label')}
      className={cn(
        'fixed inset-x-4 bottom-4 z-30 mx-auto max-w-xl items-center gap-3 rounded-2xl border border-border bg-card py-2 pl-4 pr-2 shadow-lg',
        placement === 'desktop' ? 'hidden md:flex' : 'flex',
      )}
    >
      <p className="m-0 flex-1 text-sm text-foreground">{t('text')}</p>
      <Button size="sm" className="shrink-0 rounded-full" asChild>
        <Link
          href={`/candidate/register?returnTo=${encodeURIComponent(pathname)}`}
        >
          {t('cta')}
        </Link>
      </Button>
      <button
        type="button"
        onClick={() => {
          retireSignUpBar();
          setDue(false);
        }}
        aria-label={t('dismiss')}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-5" aria-hidden />
      </button>
    </aside>
  );
}
