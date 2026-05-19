import { describe, expect, it } from 'vitest';

import { entitlementsBlobFallbackTezgaBaseline } from './packages';
import {
  employerWorkspaceResponseSchema,
  jobPostingEligibilitySchema,
} from './employer-workspace';

describe('jobPostingEligibilitySchema', () => {
  it('parses eligible', () => {
    const parsed = jobPostingEligibilitySchema.safeParse({
      kind: 'eligible',
      subscriptionId: '00000000-0000-4000-8000-000000000001',
      packageCode: 'tezga',
      maxActiveJobs: 1,
      activePipelineCount: 0,
      publishSlotsFull: false,
      entitlements: entitlementsBlobFallbackTezgaBaseline,
    });
    expect(parsed.success).toBe(true);
  });

  it('parses eligible when publish slots full', () => {
    const parsed = jobPostingEligibilitySchema.safeParse({
      kind: 'eligible',
      subscriptionId: '00000000-0000-4000-8000-000000000001',
      packageCode: 'tezga',
      maxActiveJobs: 1,
      activePipelineCount: 1,
      publishSlotsFull: true,
      entitlements: entitlementsBlobFallbackTezgaBaseline,
    });
    expect(parsed.success).toBe(true);
  });

  it('parses no_subscription', () => {
    const parsed = jobPostingEligibilitySchema.safeParse({
      kind: 'no_subscription',
    });
    expect(parsed.success).toBe(true);
  });
});

describe('employerWorkspaceResponseSchema', () => {
  it('accepts jobPosting when present', () => {
    const parsed = employerWorkspaceResponseSchema.safeParse({
      user: {
        id: '00000000-0000-4000-8000-000000000002',
        email: 'a@b.com',
        role: 'employer',
        emailVerified: true,
      },
      company: {
        id: '00000000-0000-4000-8000-000000000003',
        slug: 'acme',
        legalName: 'Acme',
      },
      assignedModerator: null,
      jobPosting: { kind: 'no_subscription' },
    });
    expect(parsed.success).toBe(true);
  });

  it('defaults jobPosting when omitted (legacy API)', () => {
    const parsed = employerWorkspaceResponseSchema.safeParse({
      user: {
        id: '00000000-0000-4000-8000-000000000002',
        email: 'a@b.com',
        role: 'employer',
        emailVerified: true,
      },
      company: {
        id: '00000000-0000-4000-8000-000000000003',
        slug: 'acme',
        legalName: 'Acme',
      },
      assignedModerator: null,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.jobPosting).toEqual({ kind: 'no_subscription' });
      expect(parsed.data.jobPostingSlots).toEqual([]);
    }
  });

  it('accepts jobPostingSlots when present', () => {
    const parsed = employerWorkspaceResponseSchema.safeParse({
      user: {
        id: '00000000-0000-4000-8000-000000000002',
        email: 'a@b.com',
        role: 'employer',
        emailVerified: true,
      },
      company: {
        id: '00000000-0000-4000-8000-000000000003',
        slug: 'acme',
        legalName: 'Acme',
      },
      assignedModerator: null,
      jobPosting: { kind: 'no_subscription' },
      jobPostingSlots: [
        {
          subscriptionId: '00000000-0000-4000-8000-000000000010',
          packageCode: 'tezga',
          packageNameSnapshot: 'TEZGA',
          maxActiveJobs: 1,
          activePipelineCount: 0,
          publishSlotsFull: false,
          entitlements: entitlementsBlobFallbackTezgaBaseline,
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });
});
