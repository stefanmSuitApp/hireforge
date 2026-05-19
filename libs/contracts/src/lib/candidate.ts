import { z } from 'zod';

import type { ApplicationStatus } from './domain';
import type { CvProfile, CvTemplateCode } from './cv-profile';
import { cvProfileSchema } from './cv-profile';
import type { PublicJobListItem } from './public-jobs';

export type {
  CandidateGenerateResumeBody,
  CvEducationEntry,
  CvExperienceEntry,
  CvPdfLayoutInput,
  CvProfile,
  CvSkillEntry,
  CvTemplateCode,
} from './cv-profile';
export {
  candidateGenerateResumeBodySchema,
  cvProfileSchema,
  cvTemplateCodeSchema,
  cvTemplateCodes,
  sanitizeCvProfileForPersist,
} from './cv-profile';

/** `PATCH /api/candidate/applications/:id` — candidate withdraws (`submitted` only server-side). */
export const candidateWithdrawApplicationBodySchema = z.object({
  status: z.literal('withdrawn'),
});

export type CandidateWithdrawApplicationBody = z.infer<
  typeof candidateWithdrawApplicationBodySchema
>;

export const candidateRegisterBodySchema = z.object({
  email: z.email().max(320),
  password: z.string().min(8).max(128),
  fullName: z.string().min(1).max(120).optional(),
});

export type CandidateRegisterBody = z.infer<typeof candidateRegisterBodySchema>;

export const candidateProfilePatchSchema = z.object({
  fullName: z.string().min(1).max(120).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  headline: z.string().trim().max(80).nullable().optional(),
  cityId: z.uuid().nullable().optional(),
  /** Replaces entire structured CV sections when sent (Step 13 builder). */
  cvProfile: cvProfileSchema.optional(),
});

export type CandidateProfilePatch = z.infer<typeof candidateProfilePatchSchema>;

export const candidateApplyBodySchema = z.object({
  jobId: z.uuid(),
  /** Cover letter, ≤ 1500 chars (SSOT §8.4). */
  coverLetterText: z.string().trim().max(1500).optional(),
  resumeAssetId: z.uuid().optional(),
});

export type CandidateApplyBody = z.infer<typeof candidateApplyBodySchema>;

export type CandidateMeResponse = {
  user: {
    id: string;
    email: string;
    role: 'candidate';
    /** False until `email_verified_at` is set; required to submit applications. */
    emailVerified: boolean;
  };
  candidate: {
    id: string;
    fullName: string | null;
    phone: string | null;
    headline: string | null;
    cityId: string | null;
    /** `cities.name_sr` when `city_id` set — for CV builder display. */
    cityLabel: string | null;
    cvProfile: CvProfile;
  };
};

export type CandidateResumeItem = {
  id: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  createdAt: string;
  source: 'uploaded' | 'generated';
  templateCode: CvTemplateCode | null;
};

export type CandidateApplicationListItem = {
  id: string;
  jobId: string;
  /** Public listing slug when published; fallback to UUID in URLs when null. */
  jobSlug: string | null;
  jobTitle: string;
  companyName: string;
  companySlug: string;
  status: ApplicationStatus;
  coverLetterText: string | null;
  resumeOriginalFilename: string | null;
  createdAt: string;
};

export const candidateSaveJobBodySchema = z.object({
  jobId: z.uuid(),
});

export type CandidateSaveJobBody = z.infer<typeof candidateSaveJobBodySchema>;

export type CandidateSavedJobsResponse = {
  items: PublicJobListItem[];
};

export const candidateSavedSearchBodySchema = z.object({
  query: z
    .record(z.string(), z.string())
    .refine((q) => Object.keys(q).length <= 48, 'Too many keys'),
});

export type CandidateSavedSearchBody = z.infer<
  typeof candidateSavedSearchBodySchema
>;

export type CandidateSavedSearchResponse = {
  id: string;
};
