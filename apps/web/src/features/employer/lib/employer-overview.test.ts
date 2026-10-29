import type { EmployerJobListItem, EmployerJobPostingSlot } from 'contracts';
import { describe, expect, it } from 'vitest';

import { employerOverview } from './employer-overview';

const NOW = new Date('2026-10-29T12:00:00Z');
const inDays = (d: number) =>
  new Date(NOW.getTime() + d * 86_400_000).toISOString();

const job = (over: Partial<EmployerJobListItem>): EmployerJobListItem => ({
  id: over.title ?? 'j',
  title: 'Posao',
  status: 'published',
  slug: null,
  updatedAt: NOW.toISOString(),
  submittedAt: null,
  publishedAt: NOW.toISOString(),
  expiresAt: null,
  applicationCount: 0,
  ...over,
});

const slot = (max: number, used: number) =>
  ({
    maxActiveJobs: max,
    activePipelineCount: used,
  }) as EmployerJobPostingSlot;

describe('employerOverview', () => {
  it('counts live and in-review jobs and every applicant', () => {
    const o = employerOverview(
      [
        job({ title: 'a', applicationCount: 2 }),
        job({ title: 'b', status: 'submitted', applicationCount: 0 }),
        job({ title: 'c', status: 'expired', applicationCount: 3 }),
        job({ title: 'd', status: 'draft' }),
      ],
      [],
      NOW,
    );
    expect(o).toMatchObject({ live: 1, inReview: 1, applicants: 5 });
  });

  it('adds up free slots across packages, and has none without a package', () => {
    expect(employerOverview([], [slot(3, 1), slot(1, 1)], NOW).slots).toEqual({
      free: 2,
      max: 4,
    });
    expect(employerOverview([], [], NOW).slots).toBeNull();
  });

  it('lists live ads ending within 7 days, soonest first', () => {
    const o = employerOverview(
      [
        job({ title: 'later', expiresAt: inDays(6) }),
        job({ title: 'soon', expiresAt: inDays(1) }),
        job({ title: 'far', expiresAt: inDays(20) }),
        job({ title: 'ended', expiresAt: inDays(-1) }),
        job({ title: 'draft', status: 'draft', expiresAt: inDays(2) }),
      ],
      [],
      NOW,
    );
    expect(o.expiringSoon.map((j) => j.title)).toEqual(['soon', 'later']);
  });

  it('puts the jobs with the most applicants first', () => {
    const o = employerOverview(
      [
        job({ title: 'one', applicationCount: 1 }),
        job({ title: 'none' }),
        job({ title: 'four', applicationCount: 4 }),
      ],
      [],
      NOW,
    );
    expect(o.withApplicants.map((j) => j.title)).toEqual(['four', 'one']);
  });
});
