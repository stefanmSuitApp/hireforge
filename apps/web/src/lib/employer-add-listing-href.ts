import type { EmployerWorkspacePayload } from '@/lib/fetch-employer-workspace';

const PACKAGES_SUBSCRIPTIONS = '/employer/packages#employer-subscriptions';

/**
 * One active subscription → open composer directly; otherwise Packages (pick package / subscription).
 */
export function resolveEmployerAddListingHref(
  workspace: EmployerWorkspacePayload,
): string {
  const slots = workspace.jobPostingSlots ?? [];
  if (workspace.jobPosting.kind === 'eligible' && slots.length === 1) {
    if (slots[0].publishSlotsFull) {
      return PACKAGES_SUBSCRIPTIONS;
    }
    return `/employer/jobs/new?subscriptionId=${slots[0].subscriptionId}`;
  }
  return PACKAGES_SUBSCRIPTIONS;
}

export const employerPackagesSubscriptionsHash = PACKAGES_SUBSCRIPTIONS;
