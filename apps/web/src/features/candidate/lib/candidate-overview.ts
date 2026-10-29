import type { CandidateApplicationListItem } from 'contracts';

/** Statuses where the employer has decided or the candidate withdrew. */
const CLOSED = new Set(['rejected', 'withdrawn', 'hired']);

export type CandidateOverview = {
  applications: number;
  inProgress: number;
  /** Newest first, at most 3. */
  recent: CandidateApplicationListItem[];
  /** What's missing from the profile, in the order to fix it. */
  missing: ('name' | 'cv')[];
};

export function candidateOverview(input: {
  applications: readonly CandidateApplicationListItem[];
  fullName: string | null;
  resumeCount: number;
}): CandidateOverview {
  const missing: CandidateOverview['missing'] = [];
  if (!input.fullName?.trim()) missing.push('name');
  if (input.resumeCount === 0) missing.push('cv');
  return {
    applications: input.applications.length,
    inProgress: input.applications.filter((a) => !CLOSED.has(a.status)).length,
    recent: [...input.applications]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 3),
    missing,
  };
}
