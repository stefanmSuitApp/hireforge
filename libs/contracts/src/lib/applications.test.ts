import { describe, expect, it } from 'vitest';

import {
  applicationCreateBodySchema,
  COVER_LETTER_MAX_CHARS,
  employerApplicationStatusPatchBodySchema,
} from './applications';
import { applicationStatuses, writableApplicationStatuses } from './domain';

describe('applicationStatuses / writableApplicationStatuses', () => {
  it('writable subset excludes legacy reviewed', () => {
    expect(writableApplicationStatuses).not.toContain('reviewed');
    expect(applicationStatuses).toContain('reviewed');
  });

  it('writable subset includes the new viewed and shortlisted', () => {
    expect(writableApplicationStatuses).toContain('viewed');
    expect(writableApplicationStatuses).toContain('shortlisted');
  });
});

describe('applicationCreateBodySchema', () => {
  it('accepts a minimal application without resume hints', () => {
    const result = applicationCreateBodySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts cover letter at the boundary length', () => {
    const result = applicationCreateBodySchema.safeParse({
      coverLetterText: 'a'.repeat(COVER_LETTER_MAX_CHARS),
    });
    expect(result.success).toBe(true);
  });

  it('rejects cover letter over the boundary length', () => {
    const result = applicationCreateBodySchema.safeParse({
      coverLetterText: 'a'.repeat(COVER_LETTER_MAX_CHARS + 1),
    });
    expect(result.success).toBe(false);
  });

  it('rejects providing both resumeAssetId AND resumeStorageKey', () => {
    const result = applicationCreateBodySchema.safeParse({
      resumeAssetId: '00000000-0000-4000-8000-000000000001',
      resumeStorageKey: 'uploads/some-key.pdf',
    });
    expect(result.success).toBe(false);
  });
});

describe('employerApplicationStatusPatchBodySchema', () => {
  it('accepts the four employer-side targets', () => {
    for (const status of [
      'viewed',
      'shortlisted',
      'rejected',
      'hired',
    ] as const) {
      expect(
        employerApplicationStatusPatchBodySchema.safeParse({ status }).success,
      ).toBe(true);
    }
  });

  it('rejects candidate-side or system-only status targets', () => {
    for (const status of ['submitted', 'withdrawn', 'reviewed']) {
      expect(
        employerApplicationStatusPatchBodySchema.safeParse({ status }).success,
      ).toBe(false);
    }
  });
});
