import type { CandidateApplicationListItem } from 'contracts';
import { describe, expect, it } from 'vitest';

import { candidateOverview } from './candidate-overview';

const app = (
  status: CandidateApplicationListItem['status'],
  createdAt: string,
): CandidateApplicationListItem =>
  ({ id: createdAt, status, createdAt }) as CandidateApplicationListItem;

describe('candidateOverview', () => {
  it('counts applications still in progress', () => {
    const o = candidateOverview({
      applications: [
        app('submitted', '2026-10-01T00:00:00Z'),
        app('viewed', '2026-10-02T00:00:00Z'),
        app('rejected', '2026-10-03T00:00:00Z'),
        app('withdrawn', '2026-10-04T00:00:00Z'),
      ],
      fullName: 'Ana',
      resumeCount: 1,
    });
    expect(o).toMatchObject({ applications: 4, inProgress: 2, missing: [] });
  });

  it('shows the three newest applications first', () => {
    const o = candidateOverview({
      applications: ['01', '04', '02', '03'].map((d) =>
        app('submitted', `2026-10-${d}T00:00:00Z`),
      ),
      fullName: 'Ana',
      resumeCount: 1,
    });
    expect(o.recent.map((a) => a.createdAt.slice(8, 10))).toEqual([
      '04',
      '03',
      '02',
    ]);
  });

  it('asks for a name and a CV when they are missing', () => {
    const o = candidateOverview({
      applications: [],
      fullName: '  ',
      resumeCount: 0,
    });
    expect(o.missing).toEqual(['name', 'cv']);
  });
});
