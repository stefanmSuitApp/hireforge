'use client';

import { Bookmark } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

type Props = {
  jobId: string;
  className?: string;
  returnToPath: string;
};

export function SaveJobButton({ jobId, className, returnToPath }: Props) {
  const t = useTranslations('Jobs');
  const locale = useLocale();
  const [saved, setSaved] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/candidate/saved-jobs', {
          cache: 'no-store',
        });
        if (!res.ok) {
          if (!cancelled) setSaved(false);
          return;
        }
        const data = (await res.json()) as { items: { id: string }[] };
        if (!cancelled) {
          setSaved(data.items.some((i) => i.id === jobId));
        }
      } catch {
        if (!cancelled) setSaved(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (pending || loading) return;
    setPending(true);
    try {
      if (saved) {
        const res = await fetch(`/api/candidate/saved-jobs/${jobId}`, {
          method: 'DELETE',
        });
        if (res.ok) setSaved(false);
      } else {
        const res = await fetch('/api/candidate/saved-jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId }),
        });
        if (res.status === 401) {
          window.location.href = `/${locale}/candidate/login?returnTo=${encodeURIComponent(returnToPath)}`;
          return;
        }
        if (res.ok) setSaved(true);
      }
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn('shrink-0 text-muted-foreground', className)}
        disabled
        aria-hidden
      >
        <Bookmark className="size-4" />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        'shrink-0',
        saved ? 'text-teal-700' : 'text-muted-foreground',
        className,
      )}
      aria-pressed={saved}
      aria-label={saved ? t('savedJob') : t('saveJob')}
      title={saved ? t('savedJob') : t('saveJob')}
      disabled={pending}
      onClick={(e) => void toggle(e)}
    >
      <Bookmark className={cn('size-4', saved && 'fill-current')} />
    </Button>
  );
}

export function SaveJobLoginHint({
  returnToPath,
  className,
}: {
  returnToPath: string;
  className?: string;
}) {
  const t = useTranslations('Jobs');
  return (
    <Button variant="ghost" size="sm" className={cn('shrink-0 px-2', className)} asChild>
      <Link
        href={`/candidate/login?returnTo=${encodeURIComponent(returnToPath)}`}
      >
        {t('saveJobLogin')}
      </Link>
    </Button>
  );
}
