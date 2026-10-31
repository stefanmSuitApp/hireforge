import { describe, expect, it } from 'vitest';

import { parseSalaryInputs, salaryInputsFrom } from './salary-inputs';

const parse = (min: string, max: string) =>
  parseSalaryInputs({ min, max, period: 'month', basis: 'net' });

describe('parseSalaryInputs', () => {
  it('two empty boxes are no salary, and valid', () => {
    expect(parse('', '  ')).toEqual({ salary: null, invalid: false });
  });

  it('reads Serbian thousands separators and spaces', () => {
    expect(parse('60.000', '80 000').salary).toEqual({
      min: 60000,
      max: 80000,
      period: 'month',
      basis: 'net',
    });
  });

  it('one box is a floor or a ceiling', () => {
    expect(parse('400', '').salary?.max).toBeNull();
    expect(parse('', '5000').salary?.min).toBeNull();
  });

  it('max below min, zero, decimals or letters are invalid', () => {
    for (const [min, max] of [
      ['90000', '80000'],
      ['0', ''],
      ['600,5', ''],
      ['oko 60k', ''],
    ] as const) {
      expect(parse(min, max)).toEqual({ salary: null, invalid: true });
    }
  });
});

describe('salaryInputsFrom', () => {
  it('fills the boxes from a stored salary, and defaults without one', () => {
    expect(
      salaryInputsFrom({ min: 400, max: null, period: 'hour', basis: 'gross' }),
    ).toEqual({ min: '400', max: '', period: 'hour', basis: 'gross' });
    expect(salaryInputsFrom(null)).toEqual({
      min: '',
      max: '',
      period: 'month',
      basis: 'net',
    });
  });
});
