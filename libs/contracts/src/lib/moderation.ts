import { z } from 'zod';

import { employerJobDraftBodySchema } from './employer-jobs';
import { jobStatusSchema } from './domain';
import type { EmployerJobPostingSlot } from './employer-workspace';
import type { PublicJobDetailResponse } from './public-jobs';

/** Query for `GET /api/moderator/jobs/queue` (`status` defaults to `submitted` in API). */
export const moderatorJobQueueQuerySchema = z.object({
  status: jobStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type ModeratorJobQueueQuery = z.infer<
  typeof moderatorJobQueueQuerySchema
>;

export type ModeratorJobQueueItem = {
  id: string;
  title: string;
  status: string;
  companyId: string;
  companySlug: string;
  companyLegalName: string;
  submittedAt: string | null;
  publishedAt: string | null;
  updatedAt: string;
};

export type ModeratorJobQueueResponse = {
  items: ModeratorJobQueueItem[];
  total: number;
};

export type ModeratorJobDetailResponse = {
  id: string;
  title: string;
  description: string;
  /** Sanitised HTML when present (preferred preview body). */
  descriptionHtml: string | null;
  status: string;
  slug: string | null;
  shortId: string | null;
  workModel: string;
  employmentType: string;
  seniority: string;
  applyMode: 'internal' | 'external';
  externalApplyUrl: string | null;
  primaryLanguage: 'sr' | 'en';
  featured: boolean;
  crossborderVisible: boolean;
  pngCreativeUrl: string | null;
  city: PublicJobDetailResponse['city'];
  category: PublicJobDetailResponse['category'];
  submittedAt: string | null;
  publishedAt: string | null;
  rejectedReason: string | null;
  archivedAt: string | null;
  updatedAt: string;
  company: { id: string; slug: string; legalName: string };
};

/** Body for `POST /moderator/jobs` — staff-created draft bound to a company. */
export const moderatorCreateJobDraftBodySchema = employerJobDraftBodySchema.and(
  z.object({
    companyId: z.uuid(),
  }),
);

export type ModeratorCreateJobDraftBody = z.infer<
  typeof moderatorCreateJobDraftBodySchema
>;

export type ModeratorJobComposerBootstrapResponse = {
  company: { id: string; slug: string; legalName: string };
  jobPostingSlots: EmployerJobPostingSlot[];
};

/** `PATCH /moderator/jobs/:id` — staff body save (draft/submitted) or published demotion. */
export type ModeratorJobPatchResponse =
  | { ok: true }
  | { ok: true; status: 'submitted'; submittedAt: string };

export const moderatorRejectBodySchema = z.object({
  reason: z.string().trim().min(1).max(4000),
});

export type ModeratorRejectBody = z.infer<typeof moderatorRejectBodySchema>;

export type ModeratorMeResponse = {
  user: { id: string; email: string; role: 'moderator' | 'admin' };
};
