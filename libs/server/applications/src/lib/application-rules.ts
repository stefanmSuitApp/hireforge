/**
 * Listing slot per (candidate, job) matches partial unique predicate:
 * `applications_candidate_job_active_unique … WHERE status <> 'withdrawn'`.
 */
export function applicationOccupiesListingSlot(status: string): boolean {
  return status !== 'withdrawn';
}

/** Step 12: re-apply blocked until 24h after withdraw (`updated_at` at transition time). */
export const REAPPLICATION_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function isWithinReapplicationCooldown(
  withdrawUpdatedAtMs: number,
  nowMs: number,
): boolean {
  return nowMs - withdrawUpdatedAtMs < REAPPLICATION_COOLDOWN_MS;
}
