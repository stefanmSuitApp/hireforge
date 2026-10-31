'use client';

import type { JobSalary } from 'contracts';
import { formatSalaryAmount } from 'contracts';
import { useFormatter, useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

type Props = { salary: JobSalary | null; className?: string };

/** "60.000–80.000 RSD neto mesečno"; nothing when the ad names no pay. */
export function JobSalaryLine({ salary, className }: Props) {
  const t = useTranslations('Salary');
  const format = useFormatter();
  if (!salary) return null;
  const amount = formatSalaryAmount(salary, (n) => format.number(n));
  return (
    <span data-testid="job-salary" className={cn(className)}>
      {t('line', {
        amount: t(`amount.${amount.kind}`, { amount: amount.text }),
        basis: t(`basis.${salary.basis}`),
        period: t(`period.${salary.period}`),
      })}
    </span>
  );
}
