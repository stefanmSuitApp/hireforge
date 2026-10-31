import { describe, expect, it } from 'vitest';

import { jobSalaryColumns, jobSalaryFromColumns } from './job-salary';

describe('job salary columns', () => {
  it('no salary clears all four columns', () => {
    expect(jobSalaryColumns(null)).toEqual({
      salaryMin: null,
      salaryMax: null,
      salaryPeriod: null,
      salaryBasis: null,
    });
    expect(jobSalaryColumns(undefined)).toEqual(jobSalaryColumns(null));
  });

  it('round-trips a floor', () => {
    const salary = {
      min: 400,
      max: null,
      period: 'hour',
      basis: 'net',
    } as const;
    expect(jobSalaryFromColumns(jobSalaryColumns(salary))).toEqual(salary);
  });

  it('a row without an amount has no salary', () => {
    expect(
      jobSalaryFromColumns({
        salaryMin: null,
        salaryMax: null,
        salaryPeriod: 'month',
        salaryBasis: 'net',
      }),
    ).toBeNull();
  });

  it('an unexpected period or basis in the row falls back to the default', () => {
    expect(
      jobSalaryFromColumns({
        salaryMin: 1,
        salaryMax: null,
        salaryPeriod: 'week',
        salaryBasis: null,
      }),
    ).toEqual({ min: 1, max: null, period: 'month', basis: 'net' });
  });
});
