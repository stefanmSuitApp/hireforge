import { z } from 'zod';

import { entitlementsBlobSchema, packageCodeSchema } from './packages';

/**
 * Whether an employer can start a new listing, and why not (PRODUCT_SSOT §5.7.1).
 *
 * Slot usage follows §5.6 using **DB job statuses** that count toward the cap:
 * `submitted` (in review) and `published` (live).
 */
export const jobPostingEligibilitySchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('eligible'),
    subscriptionId: z.uuid(),
    packageCode: packageCodeSchema,
    maxActiveJobs: z.number().int().positive(),
    /** Jobs in `submitted` or `published` bound to this subscription. */
    activePipelineCount: z.number().int().min(0),
    /**
     * When true, `submitted`+`published` count has reached `maxActive_jobs`.
     * Employers may still open the composer and save drafts; submit for review
     * remains blocked until a slot opens (SSOT §5.6).
     */
    publishSlotsFull: z.boolean(),
    /** Snapshot from the active subscription; drives composer + server validation. */
    entitlements: entitlementsBlobSchema,
  }),
  z.object({ kind: z.literal('no_subscription') }),
  z.object({
    kind: z.literal('pending_payment'),
    subscriptionId: z.uuid(),
    proformaId: z.uuid().nullable(),
  }),
]);

export type JobPostingEligibility = z.infer<typeof jobPostingEligibilitySchema>;

/** One active subscription’s listing capacity + entitlements (employer workspace). */
export const employerJobPostingSlotSchema = z.object({
  subscriptionId: z.uuid(),
  packageCode: packageCodeSchema,
  packageNameSnapshot: z.string(),
  maxActiveJobs: z.number().int().positive(),
  activePipelineCount: z.number().int().min(0),
  publishSlotsFull: z.boolean(),
  entitlements: entitlementsBlobSchema,
});

export type EmployerJobPostingSlot = z.infer<
  typeof employerJobPostingSlotSchema
>;

export const employerWorkspaceUserSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  role: z.literal('employer'),
  emailVerified: z.boolean(),
});

export const employerWorkspaceCompanySchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  legalName: z.string(),
});

export const employerWorkspaceModeratorSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  displayName: z.string().nullable(),
  phone: z.string().nullable(),
});

export const employerWorkspaceResponseSchema = z.object({
  user: employerWorkspaceUserSchema,
  company: employerWorkspaceCompanySchema,
  assignedModerator: employerWorkspaceModeratorSchema.nullable(),
  /** Older API builds may omit this; treat as blocked until the client gets a fresh payload. */
  jobPosting: jobPostingEligibilitySchema.optional().default({
    kind: 'no_subscription',
  }),
  /**
   * Every **active** subscription’s slot counter + entitlements (ordered newest first).
   * Drives per-package “Add listing” and entitlement-scoped composer config.
   */
  jobPostingSlots: z.array(employerJobPostingSlotSchema).optional().default([]),
});

export type EmployerWorkspaceResponse = z.infer<
  typeof employerWorkspaceResponseSchema
>;
