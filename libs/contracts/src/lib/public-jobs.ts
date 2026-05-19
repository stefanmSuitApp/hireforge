import { z } from 'zod';

const emptyToUndefined = (v: unknown) =>
  v === '' || v === undefined ? undefined : v;

const slugParam = z
  .string()
  .trim()
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const postedWithinSchema = z.enum(['1d', '7d', '30d']);

const easyApplySchema = z.preprocess((v) => {
  if (v === undefined || v === '') return undefined;
  return v === true || v === '1' || v === 'true';
}, z.boolean().optional());

/** Query string for `GET /api/public/jobs` (pagination + PostgreSQL search). */
export const publicJobListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  q: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  city: z.preprocess(emptyToUndefined, slugParam.optional()),
  category: z.preprocess(emptyToUndefined, slugParam.optional()),
  sort: z.enum(['newest']).default('newest'),
  workModel: z.preprocess(
    emptyToUndefined,
    z.enum(['onsite', 'remote', 'hybrid']).optional(),
  ),
  employmentType: z.preprocess(
    emptyToUndefined,
    z
      .enum([
        'full_time',
        'part_time',
        'contract',
        'internship',
        'temporary',
      ])
      .optional(),
  ),
  postedWithin: z.preprocess(
    emptyToUndefined,
    postedWithinSchema.optional(),
  ),
  easyApply: easyApplySchema,
});

export type PublicJobListQuery = z.infer<typeof publicJobListQuerySchema>;
export const publicJobDetailParamSchema = z.object({
  id: z.uuid(),
});
export const publicCompanyParamSchema = z.object({
  slug: slugParam,
});

export type PublicJobDetailParam = z.infer<typeof publicJobDetailParamSchema>;

const jobDetailSlugParam = z
  .string()
  .trim()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)+$/);

export const publicJobBySlugParamSchema = z.object({
  slug: jobDetailSlugParam,
});

export type PublicJobBySlugParam = z.infer<typeof publicJobBySlugParamSchema>;
export type PublicCompanyParam = z.infer<typeof publicCompanyParamSchema>;

export type PublicJobTaxonomyItem = {
  /** Row id (cities / job_categories) — used e.g. for candidate `city_id`. */
  id: string;
  slug: string;
  nameSr: string;
  nameEn: string | null;
  /** Serbia PTT (central office for settlement), when known — cities only. */
  postalCode?: string | null;
};

/** Cities grouped by administrative district (okrug) for optgroup UI. */
export type PublicJobTaxonomyDistrictGroup = {
  district: {
    slug: string;
    nameSr: string;
    nameEn: string | null;
  } | null;
  cities: PublicJobTaxonomyItem[];
};

export type PublicJobTaxonomyResponse = {
  /** Flat list (all cities), sorted by name. */
  cities: PublicJobTaxonomyItem[];
  /** By district (okrug); empty when DB has no `districts` rows yet. */
  cityGroups: PublicJobTaxonomyDistrictGroup[];
  categories: PublicJobTaxonomyItem[];
};

export type PublicJobListItem = {
  id: string;
  title: string;
  /** Public-canonical URL slug; null for legacy rows pre-Step 5. */
  slug: string | null;
  shortId: string | null;
  /** Whether this row should be pinned in search (ŠEF/GAZDA perk). */
  featured: boolean;
  /**
   * Plain-text excerpt (≤ 200 chars) used for Glassdoor-style cards. The full
   * description doc is NOT shipped with list responses (perf budget per SSOT
   * §11.1).
   */
  excerpt: string | null;
  applyMode: 'internal' | 'external';
  publishedAt: string | null;
  workModel: string;
  employmentType: string;
  seniority: string;
  company: { slug: string; name: string };
  city: {
    slug: string;
    nameSr: string;
    nameEn: string | null;
    postalCode: string | null;
  } | null;
  category: {
    slug: string;
    nameSr: string;
    nameEn: string | null;
  } | null;
};

export type PublicJobListResponse = {
  items: PublicJobListItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type PublicJobDetailResponse = {
  id: string;
  title: string;
  /** Legacy plain-text. Step 11 phases this out in favour of `descriptionHtml`. */
  description: string;
  /** Sanitised HTML (preferred render target post-Step 11). */
  descriptionHtml: string | null;
  slug: string | null;
  shortId: string | null;
  applyMode: 'internal' | 'external';
  externalApplyUrl: string | null;
  primaryLanguage: 'sr' | 'en';
  featured: boolean;
  /** Visible outside domestic discovery when package allows. */
  crossborderVisible: boolean;
  /** Package PNG creative asset URL when set. */
  pngCreativeUrl: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  workModel: string;
  employmentType: string;
  seniority: string;
  company: {
    slug: string;
    name: string;
  };
  city: {
    slug: string;
    nameSr: string;
    nameEn: string | null;
    postalCode: string | null;
  } | null;
  category: {
    slug: string;
    nameSr: string;
    nameEn: string | null;
  } | null;
};

export type PublicCompanyJobItem = {
  id: string;
  title: string;
  slug: string | null;
  shortId: string | null;
  publishedAt: string | null;
  workModel: string;
  employmentType: string;
  seniority: string;
  city: {
    slug: string;
    nameSr: string;
    nameEn: string | null;
    postalCode: string | null;
  } | null;
  category: {
    slug: string;
    nameSr: string;
    nameEn: string | null;
  } | null;
};

export type PublicCompanyDetailResponse = {
  company: {
    slug: string;
    name: string;
  };
  jobs: PublicCompanyJobItem[];
};

/** Companies with at least one published job (public directory). */
export type PublicEmployerDirectoryItem = {
  slug: string;
  name: string;
  publishedJobCount: number;
};

/** Body for `POST public/jobs/:id/external-click` (anonymous; session idempotency). */
export const publicJobExternalClickBodySchema = z.object({
  sessionKey: z.uuid(),
});

export type PublicJobExternalClickBody = z.infer<
  typeof publicJobExternalClickBodySchema
>;

export type PublicEmployerDirectoryResponse = {
  items: PublicEmployerDirectoryItem[];
};

/** `GET /api/public/jobs/:id/similar` — short list for job detail pane. */
export type PublicSimilarJobsResponse = {
  items: PublicJobListItem[];
};

/** `GET /api/public/jobs/previews` — compact cards for home strips (≤ 8 refs). */
export type PublicJobPreviewsResponse = {
  items: PublicJobListItem[];
};
