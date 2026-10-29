import { Check } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

import type { FirstJobStep } from '../lib/first-job-steps';

/** "Your first job ad": each step from sign-up to a live ad, current one actionable. */
export async function EmployerFirstJobChecklist({
  steps,
}: {
  steps: FirstJobStep[];
}) {
  const locale = await getLocale();
  const t = await getTranslations('Employer.firstJob');
  const current = steps.findIndex((s) => !s.done);

  return (
    <section
      aria-labelledby="first-job-title"
      className="rounded-2xl border border-primary/30 bg-primary/5 p-6"
    >
      <h2
        id="first-job-title"
        className="m-0 text-xl font-semibold text-foreground"
      >
        {t('title')}
      </h2>
      <p className="m-0 mt-1 text-sm text-muted-foreground">{t('intro')}</p>
      <ol className="m-0 mt-5 list-none space-y-3 p-0">
        {steps.map((step, i) => {
          const isCurrent = i === current;
          return (
            <li
              key={step.key}
              aria-current={isCurrent ? 'step' : undefined}
              className={cn(
                'flex flex-wrap items-center gap-3 rounded-xl px-3 py-2',
                isCurrent && 'bg-card shadow-sm',
              )}
            >
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                  step.done
                    ? 'border-primary bg-primary text-primary-foreground'
                    : isCurrent
                      ? 'border-primary text-primary'
                      : 'border-border text-muted-foreground',
                )}
              >
                {step.done ? <Check className="size-4" aria-hidden /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'm-0 text-sm font-medium',
                    step.done
                      ? 'text-muted-foreground line-through'
                      : 'text-foreground',
                  )}
                >
                  {t(`steps.${step.key}.title`)}
                  {step.done ? (
                    <span className="sr-only"> ({t('doneLabel')})</span>
                  ) : null}
                </p>
                {isCurrent ? (
                  <p className="m-0 text-xs text-muted-foreground">
                    {t(`steps.${step.key}.hint`)}
                  </p>
                ) : null}
              </div>
              {isCurrent && step.href ? (
                <Button size="sm" asChild>
                  <Link href={step.href} locale={locale}>
                    {t(`steps.${step.key}.action`)}
                  </Link>
                </Button>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
