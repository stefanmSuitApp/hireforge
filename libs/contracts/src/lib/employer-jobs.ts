import { z } from 'zod';

import {
  employmentTypeSchema,
  seniorityLevelSchema,
  workModelSchema,
} from './domain';
import { applyEmailSchema, serbianPhoneSchema } from './contact-apply';
import type { EntitlementsBlob } from './packages';

const taxonomySlug = z
  .string()
  .trim()
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const emptyToUndef = (v: unknown) =>
  v === '' || v === undefined ? undefined : v;

// --- Job authoring shared schemas (Step 5) --------------------------------

/** SEO slug shape — lowercase ASCII alphanum with single dashes between segments. */
export const jobSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

/**
 * Apply mode per SSOT §8.1, plus phone/Viber and e-mail (go-to-market WP-A5:
 * hospitality and retail hire by phone). Matches `jobs.apply_mode` CHECK.
 */
export const applyModes = ['internal', 'external', 'phone', 'email'] as const;
export type ApplyMode = (typeof applyModes)[number];
export const applyModeSchema = z.enum(applyModes);

/** A stored mode outside the contract (never written) reads as internal. */
export const toApplyMode = (v: string): ApplyMode =>
  applyModeSchema.safeParse(v).data ?? 'internal';

/** Authoring language; matches `jobs.primary_language` CHECK. */
export const jobPrimaryLanguages = ['sr', 'en'] as const;
export type JobPrimaryLanguage = (typeof jobPrimaryLanguages)[number];
export const jobPrimaryLanguageSchema = z.enum(jobPrimaryLanguages);

/**
 * ProseMirror canonical document. Step 11 (TipTap) ships strong typing; for
 * now the contract just enforces a JSON object so the API layer can pass it
 * through to the editor without coercion.
 */
export const proseMirrorDocSchema = z.looseObject({
  type: z.string().min(1),
  content: z.array(z.unknown()).optional(),
});

export type ProseMirrorDoc = z.infer<typeof proseMirrorDocSchema>;

const externalApplyHttpsUrl = z.preprocess(
  (v) => (typeof v === 'string' ? v.trim() : v),
  z
    .url()
    .max(2048)
    .refine((v) => v.startsWith('https://'), {
      message: 'External apply URL must use https://',
    }),
);

/** Matches employer job form: `https://` only, parseable URL, non-empty hostname (PNG creative slot). */
export function isValidEmployerJobPngCreativeHttpsUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && u.hostname.length > 0;
  } catch {
    return false;
  }
}

const pngCreativeHttpsUrl = z.preprocess(
  (v) => (typeof v === 'string' ? v.trim() : v),
  z.string().max(2048).refine(isValidEmployerJobPngCreativeHttpsUrl, {
    message:
      'pngCreativeUrl must be a valid https:// URL with a hostname (max 2048 characters)',
  }),
);

// --- Salary (go-to-market WP-A4) ---------------------------------------------

export const salaryPeriods = ['month', 'day', 'hour'] as const;
export type SalaryPeriod = (typeof salaryPeriods)[number];
export const salaryBases = ['net', 'gross'] as const;
export type SalaryBasis = (typeof salaryBases)[number];

const salaryAmount = z.number().int().positive().max(100_000_000).nullish();

/**
 * Whole RSD. A range, a floor ("od") or a ceiling ("do"); Serbian ads quote
 * net pay per month unless they say otherwise. Matches `jobs_salary_check`.
 */
export const jobSalarySchema = z
  .object({
    min: salaryAmount.transform((v) => v ?? null),
    max: salaryAmount.transform((v) => v ?? null),
    period: z.enum(salaryPeriods).default('month'),
    basis: z.enum(salaryBases).default('net'),
  })
  .superRefine((val, ctx) => {
    if (val.min === null && val.max === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['min'],
        message: 'A salary needs a minimum, a maximum or both',
      });
    }
    if (val.min !== null && val.max !== null && val.min > val.max) {
      ctx.addIssue({
        code: 'custom',
        path: ['max'],
        message: 'The maximum salary must not be below the minimum',
      });
    }
  });

export type JobSalary = z.infer<typeof jobSalarySchema>;

/**
 * The amount part of a salary line; the caller adds currency, period and
 * net/gross in its own language.
 */
export function formatSalaryAmount(
  salary: Pick<JobSalary, 'min' | 'max'>,
  formatNumber: (n: number) => string,
): { kind: 'range' | 'exact' | 'from' | 'upTo'; text: string } {
  const { min, max } = salary;
  if (min !== null && max !== null) {
    return min === max
      ? { kind: 'exact', text: formatNumber(min) }
      : { kind: 'range', text: `${formatNumber(min)}–${formatNumber(max)}` };
  }
  if (min !== null) return { kind: 'from', text: formatNumber(min) };
  return { kind: 'upTo', text: formatNumber(max ?? 0) };
}

/** Body for `POST /api/employer/jobs` and `PATCH /api/employer/jobs/:id` (draft only). */
export const employerJobDraftBodySchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    /** Legacy plain-text description (back-compat). Step 11 phases this out. */
    description: z.string().max(50_000).default(''),
    /** Canonical TipTap output; populated by Step 11 editor. */
    descriptionDoc: proseMirrorDocSchema.optional().nullable(),
    citySlug: z.preprocess(emptyToUndef, taxonomySlug.optional()),
    categorySlug: z.preprocess(emptyToUndef, taxonomySlug.optional()),
    workModel: workModelSchema,
    employmentType: employmentTypeSchema,
    seniority: seniorityLevelSchema,
    /** Authoring language — defaults to `sr` for back-compat. */
    primaryLanguage: jobPrimaryLanguageSchema.default('sr'),
    applyMode: applyModeSchema.default('internal'),
    /** Required when `applyMode === 'external'`; refined below. */
    externalApplyUrl: z.preprocess(
      emptyToUndef,
      externalApplyHttpsUrl.optional(),
    ),
    /** Required when `applyMode === 'phone'`; stored as `+381…`. */
    applyPhone: z.preprocess(emptyToUndef, serbianPhoneSchema.optional()),
    /** Required when `applyMode === 'email'`. */
    applyEmail: z.preprocess(emptyToUndef, applyEmailSchema.optional()),
    /** Optional employer-supplied SEO slug; service may regenerate. */
    slug: z.preprocess(emptyToUndef, jobSlugSchema.optional()),
    /** Pinned / highlighted listing — requires `featured_listing` on the subscription blob. */
    featured: z.boolean().optional(),
    /** Cross-border discovery — requires `crossborder_visible`. */
    crossborderVisible: z.boolean().optional(),
    /** HTTPS URL for package PNG creative slot — requires `png_creative`; send `null` to clear. */
    pngCreativeUrl: z.preprocess(
      (v) => (v === '' ? null : v),
      z.union([pngCreativeHttpsUrl, z.null()]).optional(),
    ),
    /** Optional pay; omitted or `null` means the ad shows none. */
    salary: jobSalarySchema.nullish(),
    /**
     * Required when the company has more than one active subscription; ignored on PATCH.
     * Binds a new draft to that subscription’s entitlements and slot cap.
     */
    subscriptionId: z.uuid().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.applyMode === 'external' && !val.externalApplyUrl) {
      ctx.addIssue({
        code: 'custom',
        path: ['externalApplyUrl'],
        message: 'externalApplyUrl is required when applyMode = "external"',
      });
    }
    if (val.applyMode === 'phone' && !val.applyPhone) {
      ctx.addIssue({
        code: 'custom',
        path: ['applyPhone'],
        message: 'applyPhone is required when applyMode = "phone"',
      });
    }
    if (val.applyMode === 'email' && !val.applyEmail) {
      ctx.addIssue({
        code: 'custom',
        path: ['applyEmail'],
        message: 'applyEmail is required when applyMode = "email"',
      });
    }
  });

export type EmployerJobDraftBody = z.infer<typeof employerJobDraftBodySchema>;

/** Mirrors `job_status` in Postgres — employer-facing job lifecycle. */
export type EmployerJobStatus =
  | 'draft'
  | 'submitted'
  | 'published'
  | 'rejected'
  | 'archived'
  | 'expired';

/** `GET /api/employer/jobs/:id` — any status (PATCH only when draft). */
export type EmployerJobDetailResponse = {
  id: string;
  title: string;
  description: string;
  /** Sanitised HTML cache; null until Step 11 backfills. */
  descriptionHtml: string | null;
  /** ProseMirror doc; null until Step 11 backfills. */
  descriptionDoc: ProseMirrorDoc | null;
  status: EmployerJobStatus;
  slug: string | null;
  shortId: string | null;
  applyMode: ApplyMode;
  externalApplyUrl: string | null;
  applyPhone: string | null;
  applyEmail: string | null;
  primaryLanguage: JobPrimaryLanguage;
  featured: boolean;
  crossborderVisible: boolean;
  /** Package PNG creative slot; null when unset or not entitled. */
  pngCreativeUrl: string | null;
  salary: JobSalary | null;
  citySlug: string | null;
  categorySlug: string | null;
  workModel: string;
  employmentType: string;
  seniority: string;
  updatedAt: string;
  submittedAt: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  rejectedReason: string | null;
  /** Subscription this listing is billed under; null for legacy rows. */
  subscriptionId: string | null;
  /** Subscription snapshot for this job’s package; drives listing composer when editing. */
  authoringEntitlements: EntitlementsBlob | null;
};

/** `PATCH /api/employer/jobs/:id` — draft save (`job` echoed after write) or demotion to submitted. */
export type EmployerJobDraftPatchResponse =
  | { ok: true; job: EmployerJobDetailResponse }
  | { ok: true; status: 'submitted'; submittedAt: string };

const jobDescriptionMediaPublicUrlSchema = z
  .string()
  .min(1)
  .refine(
    (value) => {
      const v = value.trim();
      if (
        /^\/api\/public\/job-description-media\/[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(
          v,
        )
      ) {
        return true;
      }
      try {
        const u = new URL(v);
        return u.protocol === 'http:' || u.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'Invalid job description media URL' },
  );

export const employerJobDescriptionImageUploadResponseSchema = z.object({
  /** Same-origin `/api/public/...` path (default) or absolute URL when `JOB_DESCRIPTION_MEDIA_PUBLIC_ORIGIN` is set. */
  url: jobDescriptionMediaPublicUrlSchema,
});

export type EmployerJobDescriptionImageUploadResponse = z.infer<
  typeof employerJobDescriptionImageUploadResponseSchema
>;

/** `GET /api/employer/jobs` row. */
export type EmployerJobListItem = {
  id: string;
  title: string;
  status: EmployerJobStatus;
  /** Public URL slug when published (null for drafts / legacy). */
  slug: string | null;
  updatedAt: string;
  submittedAt: string | null;
  publishedAt: string | null;
  /** When a published ad ends (null: no end date set). */
  expiresAt: string | null;
  /** Applications that weren't withdrawn. */
  applicationCount: number;
};

/** `GET /api/employer/jobs/:jobId/applications` row. */
export type EmployerJobApplicationItem = {
  id: string;
  status: string;
  candidateEmail: string;
  /** The name on the candidate's profile, when they gave one. */
  candidateName: string | null;
  createdAt: string;
  /** Present when candidate attached a CV to the application. */
  resumeOriginalFilename: string | null;
  /** What the candidate wrote when applying (optional, ≤ 1500 chars). */
  coverLetterText: string | null;
};
