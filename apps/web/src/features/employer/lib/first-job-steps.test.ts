import { employerWorkspaceResponseSchema } from 'contracts';
import { describe, expect, it } from 'vitest';

import { firstJobSteps } from './first-job-steps';

const SUB = '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b';
const PF = '7a2b3c4d-5e6f-4a70-8b8c-9d0e1f2a3b4c';

const workspace = (over: Record<string, unknown> = {}) =>
  employerWorkspaceResponseSchema.parse({
    user: {
      id: '1b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c5d',
      email: 'ana@firma.rs',
      role: 'employer',
      emailVerified: false,
    },
    company: {
      id: '2c3d4e5f-6071-4b8c-9d0e-1f2a3b4c5d6e',
      slug: 'firma',
      legalName: 'Firma d.o.o.',
    },
    assignedModerator: null,
    ...over,
  });

const done = (w: ReturnType<typeof workspace>) =>
  firstJobSteps(w)?.map((s) => `${s.key}:${s.done ? 'x' : '-'}`);

describe('firstJobSteps', () => {
  it('starts a brand-new employer at "verify your email"', () => {
    expect(done(workspace())).toEqual([
      'verifyEmail:-',
      'choosePackage:-',
      'payment:-',
      'writeAd:-',
      'submit:-',
      'published:-',
    ]);
  });

  it('links an unpaid package to its proforma', () => {
    const steps = firstJobSteps(
      workspace({
        user: {
          id: '1b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c5d',
          email: 'ana@firma.rs',
          role: 'employer',
          emailVerified: true,
        },
        jobPosting: {
          kind: 'pending_payment',
          subscriptionId: SUB,
          proformaId: PF,
        },
      }),
    );
    expect(steps?.find((s) => s.key === 'payment')).toEqual({
      key: 'payment',
      done: false,
      href: `/employer/billing/proforma/${PF}`,
    });
    expect(steps?.find((s) => s.key === 'choosePackage')?.done).toBe(true);
  });

  it('counts a job in review as written and submitted', () => {
    const w = workspace({
      jobCounts: {
        draft: 0,
        submitted: 1,
        published: 0,
        rejected: 0,
        ended: 0,
      },
    });
    expect(done(w)).toContain('writeAd:x');
    expect(done(w)).toContain('submit:x');
  });

  it('disappears once a job has been live', () => {
    expect(
      firstJobSteps(
        workspace({
          jobCounts: {
            draft: 0,
            submitted: 0,
            published: 0,
            rejected: 0,
            ended: 1,
          },
        }),
      ),
    ).toBeNull();
  });
});
