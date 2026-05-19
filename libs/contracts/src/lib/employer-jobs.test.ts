import { describe, expect, it } from 'vitest';

import {
  applyModeSchema,
  employerJobDraftBodySchema,
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
