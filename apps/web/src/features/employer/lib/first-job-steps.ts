import type { EmployerWorkspacePayload } from '@/lib/fetch-employer-workspace';
import { resolveEmployerAddListingHref } from '@/lib/employer-add-listing-href';

export type FirstJobStepKey =
  | 'verifyEmail'
  | 'choosePackage'
  | 'payment'
  | 'writeAd'
  | 'submit'
  | 'published';

export type FirstJobStep = {
  key: FirstJobStepKey;
  done: boolean;
  /** Where to do it; none when the step happens elsewhere (email, moderation). */
  href: string | null;
};

/**
 * The path from sign-up to the first live ad, from the employer's real
 * state. Null once any job has been live: the checklist has done its job.
 */
export function firstJobSteps(
  workspace: EmployerWorkspacePayload,
): FirstJobStep[] | null {
  const c = workspace.jobCounts;
  if (c.published + c.ended > 0) return null;

  const posting = workspace.jobPosting;
  const hasPackage = posting.kind !== 'no_subscription';
  const paid = posting.kind === 'eligible';
  const anyJob = c.draft + c.submitted + c.rejected > 0;

  return [
    { key: 'verifyEmail', done: workspace.user.emailVerified, href: null },
    {
      key: 'choosePackage',
      done: hasPackage,
      href: '/employer/packages',
    },
    {
      key: 'payment',
      done: paid,
      href:
        posting.kind === 'pending_payment' && posting.proformaId
          ? `/employer/billing/proforma/${posting.proformaId}`
          : null,
    },
    {
      key: 'writeAd',
      done: anyJob,
      href: paid ? resolveEmployerAddListingHref(workspace) : null,
    },
    {
      key: 'submit',
      done: c.submitted > 0,
      href: anyJob ? '/employer/jobs' : null,
    },
    { key: 'published', done: false, href: null },
  ];
}
