import { describe, expect, it } from 'vitest';

import {
  applicationCreateBodySchema,
  canEmployerMoveApplication,
  candidateWithdrawableStatuses,
  COVER_LETTER_MAX_CHARS,
  employerApplicationNextStatuses,
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

describe('employer application transitions (SSOT §15.4)', () => {
  it('an unread or read application can be shortlisted or rejected', () => {
    for (const from of ['submitted', 'viewed'])
      expect(employerApplicationNextStatuses(from)).toEqual([
        'shortlisted',
        'rejected',
      ]);
  });

  it('a shortlisted applicant is hired or rejected', () => {
    expect(employerApplicationNextStatuses('shortlisted')).toEqual([
      'hired',
      'rejected',
    ]);
  });

  it('hired, rejected and withdrawn are final for the employer', () => {
    for (const from of ['hired', 'rejected', 'withdrawn', 'reviewed'])
      expect(employerApplicationNextStatuses(from)).toEqual([]);
  });

  it('only a new application turns "viewed"', () => {
    expect(canEmployerMoveApplication('submitted', 'viewed')).toBe(true);
    expect(canEmployerMoveApplication('viewed', 'viewed')).toBe(false);
    expect(canEmployerMoveApplication('shortlisted', 'viewed')).toBe(false);
  });

  it('hiring skips no step', () => {
    expect(canEmployerMoveApplication('submitted', 'hired')).toBe(false);
    expect(canEmployerMoveApplication('viewed', 'hired')).toBe(false);
    expect(canEmployerMoveApplication('shortlisted', 'hired')).toBe(true);
  });

  it('the candidate can withdraw until a decision is made', () => {
    expect([...candidateWithdrawableStatuses]).toEqual([
      'submitted',
      'viewed',
      'shortlisted',
    ]);
  });
});
