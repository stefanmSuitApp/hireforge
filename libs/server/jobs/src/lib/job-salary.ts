import type { JobSalary } from 'contracts';
import { salaryBases, salaryPeriods } from 'contracts';

export type JobSalaryColumns = {
  salaryMin: number | null;
  salaryMax: number | null;
  salaryPeriod: string | null;
  salaryBasis: string | null;
};

/** Draft body → the four `jobs` columns (all null when there is no salary). */
export function jobSalaryColumns(
  salary: JobSalary | null | undefined,
): JobSalaryColumns {
  if (!salary) {
    return {
      salaryMin: null,
      salaryMax: null,
      salaryPeriod: null,
      salaryBasis: null,
    };
  }
  return {
    salaryMin: salary.min,
    salaryMax: salary.max,
    salaryPeriod: salary.period,
    salaryBasis: salary.basis,
  };
}

const isPeriod = (v: string | null): v is JobSalary['period'] =>
  (salaryPeriods as readonly (string | null)[]).includes(v);
const isBasis = (v: string | null): v is JobSalary['basis'] =>
  (salaryBases as readonly (string | null)[]).includes(v);

export function jobSalaryFromColumns(row: JobSalaryColumns): JobSalary | null {
  if (row.salaryMin === null && row.salaryMax === null) return null;
  return {
    min: row.salaryMin,
    max: row.salaryMax,
    period: isPeriod(row.salaryPeriod) ? row.salaryPeriod : 'month',
    basis: isBasis(row.salaryBasis) ? row.salaryBasis : 'net',
  };
}
