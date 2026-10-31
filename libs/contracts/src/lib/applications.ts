import { z } from 'zod';

import { applicationStatusSchema } from './domain';

// --- Cover letter shape ----------------------------------------------------

/** Maximum cover letter length per SSOT §8.4. */
export const COVER_LETTER_MAX_CHARS = 1_500;

export const coverLetterTextSchema = z
  .string()
  .trim()
  .max(COVER_LETTER_MAX_CHARS);

// --- Apply request ---------------------------------------------------------

/**
 * Body for `POST /api/jobs/:jobId/apply`.
 *
 * Either `resumeAssetId` (existing CV) or `resumeStorageKey` (just-uploaded
 * upload-url completion) must be present. Service code resolves either to a
 * `resume_asset_id` row plus snapshot fields stored on the application.
 */
export const applicationCreateBodySchema = z
  .object({
    /** Candidate's existing CV id (default to primary if omitted). */
    resumeAssetId: z.uuid().optional(),
    /** Storage key returned by the upload pre-sign endpoint (Step 13). */
    resumeStorageKey: z.string().trim().min(1).max(512).optional(),
    /** Optional, ≤ 1500 chars after trim. */
    coverLetterText: coverLetterTextSchema.optional(),
  })
  .superRefine((val, ctx) => {
    if (val.resumeAssetId && val.resumeStorageKey) {
      ctx.addIssue({
        code: 'custom',
        path: ['resumeAssetId'],
        message: 'Provide either resumeAssetId OR resumeStorageKey, not both',
      });
    }
  });

export type ApplicationCreateBody = z.infer<typeof applicationCreateBodySchema>;

// --- Status transitions ----------------------------------------------------

/**
 * Allowed status changes the **employer** can post via
 * `PATCH /api/employer/applications/:id`.
 *
 * `withdrawn` is a candidate-side action (`PATCH /api/candidate/applications/:id` with `{ "status": "withdrawn" }`).
 * `submitted` is the system default on creation; not POSTable.
 */
export const employerApplicationStatusTargets = [
  'viewed',
  'shortlisted',
  'rejected',
  'hired',
] as const;

export type EmployerApplicationStatusTarget =
  (typeof employerApplicationStatusTargets)[number];

export const employerApplicationStatusTargetSchema = z.enum(
  employerApplicationStatusTargets,
);

export const employerApplicationStatusPatchBodySchema = z.object({
  status: employerApplicationStatusTargetSchema,
});

export type EmployerApplicationStatusPatchBody = z.infer<
  typeof employerApplicationStatusPatchBodySchema
>;

/**
 * Decisions the employer can take next (SSOT §15.4). An unread application
 * can be decided on directly: deciding means it was read.
 */
export function employerApplicationNextStatuses(
  from: string,
): ('shortlisted' | 'rejected' | 'hired')[] {
  switch (from) {
    case 'submitted':
    case 'viewed':
      return ['shortlisted', 'rejected'];
    case 'shortlisted':
      return ['hired', 'rejected'];
    default:
      return [];
  }
}

export function canEmployerMoveApplication(
  from: string,
  to: EmployerApplicationStatusTarget,
): boolean {
  if (to === 'viewed') return from === 'submitted';
  return (employerApplicationNextStatuses(from) as string[]).includes(to);
}

/** SSOT §15.4: withdraw is possible until the employer hires or rejects. */
export const candidateWithdrawableStatuses = [
  'submitted',
  'viewed',
  'shortlisted',
] as const;

// --- Response shape --------------------------------------------------------

export const applicationResponseSchema = z.object({
  id: z.uuid(),
  jobId: z.uuid(),
  candidateId: z.uuid(),
  status: applicationStatusSchema,
  coverLetterText: z.string().nullable(),
  resumeAssetId: z.uuid().nullable(),
  resumeFilename: z.string().nullable(),
  resumeStorageKey: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ApplicationResponse = z.infer<typeof applicationResponseSchema>;
