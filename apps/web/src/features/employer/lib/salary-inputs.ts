import type { JobSalary, SalaryBasis, SalaryPeriod } from 'contracts';
import { jobSalarySchema } from 'contracts';

export type SalaryInputs = {
  min: string;
  max: string;
  period: SalaryPeriod;
  basis: SalaryBasis;
};

/** "60.000", "60 000" and "60000" are the same amount; anything else is not a number. */
function amount(raw: string): number | null | 'invalid' {
  const compact = raw.replace(/[\s.]/g, '');
  if (compact === '') return null;
  return /^\d+$/.test(compact) ? Number(compact) : 'invalid';
}

/** The job form's salary boxes → the draft body's `salary`. */
export function parseSalaryInputs(inputs: SalaryInputs): {
  salary: JobSalary | null;
  invalid: boolean;
} {
  const min = amount(inputs.min);
  const max = amount(inputs.max);
  if (min === 'invalid' || max === 'invalid') {
    return { salary: null, invalid: true };
  }
  if (min === null && max === null) return { salary: null, invalid: false };
  const parsed = jobSalarySchema.safeParse({
    min,
    max,
    period: inputs.period,
    basis: inputs.basis,
  });
  return parsed.success
    ? { salary: parsed.data, invalid: false }
    : { salary: null, invalid: true };
}

export function salaryInputsFrom(salary: JobSalary | null | undefined) {
  return {
    min: salary?.min != null ? String(salary.min) : '',
    max: salary?.max != null ? String(salary.max) : '',
    period: salary?.period ?? 'month',
    basis: salary?.basis ?? 'net',
  } satisfies SalaryInputs;
}
