import type { EmployerJobListItem, EmployerJobPostingSlot } from 'contracts';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type EmployerOverview = {
  live: number;
  inReview: number;
  applicants: number;
  /** Null when the company has no active package. */
  slots: { free: number; max: number } | null;
  /** Live ads ending within 7 days, soonest first. */
  expiringSoon: EmployerJobListItem[];
  /** Jobs that have applicants, most first (top 5). */
  withApplicants: EmployerJobListItem[];
};

export function employerOverview(
  jobs: readonly EmployerJobListItem[],
  slots: readonly EmployerJobPostingSlot[],
  now: Date = new Date(),
): EmployerOverview {
  const live = jobs.filter((j) => j.status === 'published');
  const max = slots.reduce((sum, s) => sum + s.maxActiveJobs, 0);
  const used = slots.reduce((sum, s) => sum + s.activePipelineCount, 0);
  const until = now.getTime() + WEEK_MS;
  return {
    live: live.length,
    inReview: jobs.filter((j) => j.status === 'submitted').length,
    applicants: jobs.reduce((sum, j) => sum + j.applicationCount, 0),
    slots: slots.length ? { free: Math.max(max - used, 0), max } : null,
    expiringSoon: live
      .filter((j) => {
        const end = j.expiresAt ? Date.parse(j.expiresAt) : NaN;
        return end >= now.getTime() && end <= until;
      })
      .sort(
        (a, b) => Date.parse(a.expiresAt ?? '') - Date.parse(b.expiresAt ?? ''),
      ),
    withApplicants: jobs
      .filter((j) => j.applicationCount > 0)
      .sort((a, b) => b.applicationCount - a.applicationCount)
      .slice(0, 5),
  };
}
