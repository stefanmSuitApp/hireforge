import { describe, expect, it } from 'vitest';

import {
  applyModeSchema,
  employerJobDraftBodySchema,
  formatSalaryAmount,
  jobPrimaryLanguageSchema,
  jobSlugSchema,
  proseMirrorDocSchema,
} from './employer-jobs';

const baseValid = {
  title: 'Senior React Developer',
  description: '',
  workModel: 'hybrid',
  employmentType: 'full_time',
  seniority: 'senior',
};

describe('proseMirrorDocSchema', () => {
  it('allows extra keys (TipTap / ProseMirror attrs)', () => {
    const result = proseMirrorDocSchema.safeParse({
      type: 'doc',
      attrs: { version: 1 },
      content: [],
    });
    expect(result.success).toBe(true);
  });
});

describe('jobSlugSchema', () => {
  it('accepts lowercase ASCII alphanum with single dashes', () => {
    expect(jobSlugSchema.safeParse('senior-react-developer').success).toBe(
      true,
    );
    expect(jobSlugSchema.safeParse('node-js-2026').success).toBe(true);
    expect(jobSlugSchema.safeParse('a').success).toBe(true);
  });

  it('rejects uppercase, leading/trailing dash, double dash, diacritics', () => {
    for (const bad of [
      'Senior-React',
      '-leading',
      'trailing-',
      'double--dash',
      'šljakam',
      'with space',
      '',
    ]) {
      expect(jobSlugSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe('applyModeSchema / jobPrimaryLanguageSchema', () => {
  it('accepts the documented values only', () => {
    expect(applyModeSchema.safeParse('internal').success).toBe(true);
    expect(applyModeSchema.safeParse('external').success).toBe(true);
    expect(applyModeSchema.safeParse('redirect').success).toBe(false);

    expect(jobPrimaryLanguageSchema.safeParse('sr').success).toBe(true);
    expect(jobPrimaryLanguageSchema.safeParse('en').success).toBe(true);
    expect(jobPrimaryLanguageSchema.safeParse('de').success).toBe(false);
  });
});

describe('employerJobDraftBodySchema', () => {
  it('accepts a minimal internal-apply draft', () => {
    const result = employerJobDraftBodySchema.safeParse(baseValid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.applyMode).toBe('internal');
      expect(result.data.primaryLanguage).toBe('sr');
    }
  });

  it('rejects external apply mode without externalApplyUrl', () => {
    const result = employerJobDraftBodySchema.safeParse({
      ...baseValid,
      applyMode: 'external',
    });
    expect(result.success).toBe(false);
  });

  it('rejects http:// external apply url (https-only)', () => {
    const result = employerJobDraftBodySchema.safeParse({
      ...baseValid,
      applyMode: 'external',
      externalApplyUrl: 'http://employer.example.com/apply',
    });
    expect(result.success).toBe(false);
  });

  it('accepts https external apply url', () => {
    const result = employerJobDraftBodySchema.safeParse({
      ...baseValid,
      applyMode: 'external',
      externalApplyUrl: 'https://employer.example.com/apply',
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional packaging fields', () => {
    const result = employerJobDraftBodySchema.safeParse({
      ...baseValid,
      featured: true,
      crossborderVisible: false,
      pngCreativeUrl: 'https://cdn.example.com/banner.png',
    });
    expect(result.success).toBe(true);
  });

  it('accepts null pngCreativeUrl to clear', () => {
    const result = employerJobDraftBodySchema.safeParse({
      ...baseValid,
      pngCreativeUrl: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pngCreativeUrl).toBeNull();
    }
  });

  it('rejects pngCreativeUrl that is not https', () => {
    const result = employerJobDraftBodySchema.safeParse({
      ...baseValid,
      pngCreativeUrl: 'http://cdn.example.com/banner.png',
    });
    expect(result.success).toBe(false);
  });

  it('rejects pngCreativeUrl that is not a valid URL', () => {
    const result = employerJobDraftBodySchema.safeParse({
      ...baseValid,
      pngCreativeUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('rejects pngCreativeUrl with empty hostname', () => {
    const result = employerJobDraftBodySchema.safeParse({
      ...baseValid,
      pngCreativeUrl: 'https://',
    });
    expect(result.success).toBe(false);
  });
});

describe('salary on a job draft', () => {
  const parse = (salary: unknown) =>
    employerJobDraftBodySchema.safeParse({ ...baseValid, salary });

  it('is optional; no salary is null', () => {
    const r = employerJobDraftBodySchema.parse(baseValid);
    expect(r.salary ?? null).toBeNull();
    expect(parse(null).success).toBe(true);
  });

  it('a range, a floor or a ceiling, net per month by default', () => {
    expect(parse({ min: 60000, max: 80000 }).data?.salary).toEqual({
      min: 60000,
      max: 80000,
      period: 'month',
      basis: 'net',
    });
    expect(parse({ min: 400, period: 'hour' }).success).toBe(true);
    expect(parse({ max: 5000, period: 'day', basis: 'gross' }).success).toBe(
      true,
    );
  });

  it('needs at least one amount, and min ≤ max', () => {
    expect(parse({ period: 'month' }).success).toBe(false);
    expect(parse({ min: 90000, max: 80000 }).success).toBe(false);
  });

  it('whole positive dinars only', () => {
    expect(parse({ min: 0 }).success).toBe(false);
    expect(parse({ min: 60000.5 }).success).toBe(false);
    expect(parse({ min: -1 }).success).toBe(false);
  });

  it('an unknown period or basis is refused', () => {
    expect(parse({ min: 1, period: 'week' }).success).toBe(false);
    expect(parse({ min: 1, basis: 'cash' }).success).toBe(false);
  });
});

describe('formatSalaryAmount', () => {
  it('a range, a floor, a ceiling and a fixed amount', () => {
    const fmt = (n: number) => n.toLocaleString('sr-RS');
    expect(formatSalaryAmount({ min: 60000, max: 80000 }, fmt)).toEqual({
      kind: 'range',
      text: `${fmt(60000)}–${fmt(80000)}`,
    });
    expect(formatSalaryAmount({ min: 60000, max: 60000 }, fmt)).toEqual({
      kind: 'exact',
      text: fmt(60000),
    });
    expect(formatSalaryAmount({ min: 400, max: null }, fmt)).toEqual({
      kind: 'from',
      text: fmt(400),
    });
    expect(formatSalaryAmount({ min: null, max: 5000 }, fmt)).toEqual({
      kind: 'upTo',
      text: fmt(5000),
    });
  });
});
