import { z } from 'zod';

import {
  countryCodeSchema,
  currencyCodeSchema,
  ibanSchema,
  mbSchema,
  pibSchema,
  swiftBicSchema,
  taxIdSchema,
  vatIdSchema,
  vatTreatmentSchema,
  type CompanySource,
  type SalesStatus,
  type VatTreatment,
} from './companies';
import { userRoleSchema } from './domain';

/** URL-safe company slug (lowercase, hyphens). */
export const companySlugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug')
  .max(200);

/** Moderator tabs: owned rows, pickup pool, or full list (admin-only). */
export const staffCompanyListViewSchema = z.enum(['my', 'pool', 'all']);

export const staffCompanyListQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  view: staffCompanyListViewSchema.optional(),
  /** Staff UI may request up to 200 (e.g. employer reassign dropdown). */
  limit: z.coerce.number().int().min(1).max(200).optional().default(25),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type StaffCompanyListQuery = z.infer<typeof staffCompanyListQuerySchema>;

export type StaffCompanyListItem = {
  id: string;
  slug: string;
  legalName: string;
  verified: boolean;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  salesStatus: SalesStatus;
  assignedModeratorId: string | null;
  assignedModeratorEmail: string | null;
  source: CompanySource;
};

export type StaffCompanyListResponse = {
  items: StaffCompanyListItem[];
  total: number;
};

export type StaffCompanyEmployerMember = {
  employerId: string;
  userId: string;
  email: string;
};

/**
 * Staff company detail.
 *
 * Step 3 (Schema delta A) introduces a wide set of foreign-aware billing and
 * sales-ownership fields. They are typed as **optional** on this response so
 * the existing `StaffCompaniesService.getById` (which selects only the legacy
 * subset) still compiles unchanged. Step 8 wires the moderator UI and tightens
 * these fields to required-nullable shapes.
 */
export type StaffCompanyDetailResponse = {
  id: string;
  slug: string;
  legalName: string;
  verified: boolean;
  verifiedAt: string | null;
  verifiedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  employers: StaffCompanyEmployerMember[];
  // Step 3 additions — optional until Step 8 wires the moderator UI.
  isForeign?: boolean;
  countryCode?: string;
  pib?: string | null;
  mb?: string | null;
  vatId?: string | null;
  taxId?: string | null;
  registrationNumber?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  addressPostalCode?: string | null;
  addressCity?: string | null;
  addressStateRegion?: string | null;
  bankName?: string | null;
  iban?: string | null;
  swiftBic?: string | null;
  bankCountryCode?: string | null;
  accountCurrency?: string | null;
  invoiceCurrency?: string;
  invoiceLanguage?: 'sr' | 'en';
  vatTreatment?: VatTreatment;
  billingEmail?: string | null;
  billingPhone?: string | null;
  billingContactName?: string | null;
  responsiblePerson?: string | null;
  responsiblePosition?: string | null;
  salesStatus?: SalesStatus;
  assignedModeratorId?: string | null;
  closedWonAt?: string | null;
  closedLostAt?: string | null;
  source?: CompanySource;
  /** When `assigned_moderator_id` is set, staff moderator / admin email. */
  assignedModeratorEmail?: string | null;
};

/**
 * Moderator / admin company create body.
 *
 * Mirrors moderator-lead semantics (per SSOT §5.3): every billing field is
 * optional so a moderator can capture a partial lead. Self-signup paths use
 * the stricter `companyDomesticInputSchema` / `companyForeignInputSchema` from
 * `./companies`.
 */
export const staffCompanyCreateBodySchema = z.object({
  slug: companySlugSchema,
  legalName: z.string().trim().min(1).max(500),
  isForeign: z.boolean().optional(),
  countryCode: countryCodeSchema.optional(),
  pib: pibSchema.optional().nullable(),
  mb: mbSchema.optional().nullable(),
  vatId: vatIdSchema.optional().nullable(),
  taxId: taxIdSchema.optional().nullable(),
  registrationNumber: z.string().trim().max(80).optional().nullable(),
  addressLine1: z.string().trim().max(300).optional().nullable(),
  addressLine2: z.string().trim().max(300).optional().nullable(),
  addressPostalCode: z.string().trim().max(40).optional().nullable(),
  addressCity: z.string().trim().max(200).optional().nullable(),
  addressStateRegion: z.string().trim().max(200).optional().nullable(),
  bankName: z.string().trim().max(300).optional().nullable(),
  iban: ibanSchema.optional().nullable(),
  swiftBic: swiftBicSchema.optional().nullable(),
  bankCountryCode: countryCodeSchema.optional().nullable(),
  accountCurrency: currencyCodeSchema.optional().nullable(),
  invoiceCurrency: currencyCodeSchema.optional(),
  invoiceLanguage: z.enum(['sr', 'en']).optional(),
  vatTreatment: vatTreatmentSchema.optional(),
  billingEmail: z.email().max(320).optional().nullable(),
  billingPhone: z.string().trim().max(40).optional().nullable(),
  billingContactName: z.string().trim().max(200).optional().nullable(),
  responsiblePerson: z.string().trim().max(200).optional().nullable(),
  responsiblePosition: z.string().trim().max(200).optional().nullable(),
});

export type StaffCompanyCreateBody = z.infer<
  typeof staffCompanyCreateBodySchema
>;

export const staffCompanyPatchBodySchema = z
  .object({
    slug: companySlugSchema.optional(),
    legalName: z.string().trim().min(1).max(500).optional(),
    /** When true, records verification; when false, clears verification. */
    verified: z.boolean().optional(),
    isForeign: z.boolean().optional(),
    countryCode: countryCodeSchema.optional(),
    pib: pibSchema.optional().nullable(),
    mb: mbSchema.optional().nullable(),
    vatId: vatIdSchema.optional().nullable(),
    taxId: taxIdSchema.optional().nullable(),
    registrationNumber: z.string().trim().max(80).optional().nullable(),
    addressLine1: z.string().trim().max(300).optional().nullable(),
    addressLine2: z.string().trim().max(300).optional().nullable(),
    addressPostalCode: z.string().trim().max(40).optional().nullable(),
    addressCity: z.string().trim().max(200).optional().nullable(),
    addressStateRegion: z.string().trim().max(200).optional().nullable(),
    bankName: z.string().trim().max(300).optional().nullable(),
    iban: ibanSchema.optional().nullable(),
    swiftBic: swiftBicSchema.optional().nullable(),
    bankCountryCode: countryCodeSchema.optional().nullable(),
    accountCurrency: currencyCodeSchema.optional().nullable(),
    invoiceCurrency: currencyCodeSchema.optional(),
    invoiceLanguage: z.enum(['sr', 'en']).optional(),
    vatTreatment: vatTreatmentSchema.optional(),
    billingEmail: z.email().max(320).optional().nullable(),
    billingPhone: z.string().trim().max(40).optional().nullable(),
    billingContactName: z.string().trim().max(200).optional().nullable(),
    responsiblePerson: z.string().trim().max(200).optional().nullable(),
    responsiblePosition: z.string().trim().max(200).optional().nullable(),
  })
  .refine((b) => Object.keys(b).length > 0, {
    message: 'At least one field required',
  });

export type StaffCompanyPatchBody = z.infer<typeof staffCompanyPatchBodySchema>;

export const staffCompanyCloseLostBodySchema = z.object({
  note: z.string().trim().max(500).optional(),
});

export type StaffCompanyCloseLostBody = z.infer<
  typeof staffCompanyCloseLostBodySchema
>;

export const staffEmployerListQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type StaffEmployerListQuery = z.infer<
  typeof staffEmployerListQuerySchema
>;

export type StaffEmployerListItem = {
  employerId: string;
  userId: string;
  email: string;
  companyId: string;
  companySlug: string;
  companyLegalName: string;
};

export type StaffEmployerListResponse = {
  items: StaffEmployerListItem[];
  total: number;
};

export const staffEmployerPatchBodySchema = z.object({
  companyId: z.uuid(),
});

export type StaffEmployerPatchBody = z.infer<
  typeof staffEmployerPatchBodySchema
>;

// --- Admin (role admin only) ---

export const adminUserListQuerySchema = z.object({
  role: userRoleSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;

export type AdminUserListItem = {
  id: string;
  email: string;
  role: z.infer<typeof userRoleSchema>;
  createdAt: string;
  updatedAt: string;
};

export type AdminUserListResponse = {
  items: AdminUserListItem[];
  total: number;
};

export const adminUserPatchBodySchema = z.object({
  role: userRoleSchema,
});

export type AdminUserPatchBody = z.infer<typeof adminUserPatchBodySchema>;

export const adminJobCategoryCreateBodySchema = z.object({
  slug: companySlugSchema,
  nameSr: z.string().trim().min(1).max(300),
  nameEn: z.string().trim().max(300).optional(),
});

export type AdminJobCategoryCreateBody = z.infer<
  typeof adminJobCategoryCreateBodySchema
>;

export const adminJobCategoryPatchBodySchema = z
  .object({
    slug: companySlugSchema.optional(),
    nameSr: z.string().trim().min(1).max(300).optional(),
    nameEn: z.string().trim().max(300).nullable().optional(),
  })
  .refine((b) => Object.keys(b).length > 0, {
    message: 'At least one field required',
  });

export type AdminJobCategoryPatchBody = z.infer<
  typeof adminJobCategoryPatchBodySchema
>;

export type AdminJobCategoryItem = {
  id: string;
  slug: string;
  nameSr: string;
  nameEn: string | null;
  createdAt: string;
};

export type AdminJobCategoryListResponse = {
  items: AdminJobCategoryItem[];
};

export const adminAuditListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type AdminAuditListQuery = z.infer<typeof adminAuditListQuerySchema>;

export type AdminAuditListItem = {
  id: string;
  actorUserId: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type AdminAuditListResponse = {
  items: AdminAuditListItem[];
  total: number;
};

export const adminCompanyReassignBodySchema = z.object({
  toUserId: z.uuid(),
  reason: z.string().trim().min(1).max(2000),
});

export type AdminCompanyReassignBody = z.infer<
  typeof adminCompanyReassignBodySchema
>;

export type AdminCompanyAssignmentHistoryItem = {
  id: string;
  companyId: string;
  fromUserId: string | null;
  fromUserEmail: string | null;
  toUserId: string | null;
  toUserEmail: string | null;
  changedByAdminId: string;
  changedByAdminEmail: string;
  reason: string;
  createdAt: string;
};

export type AdminCompanyAssignmentHistoryResponse = {
  items: AdminCompanyAssignmentHistoryItem[];
};

/** Admin-only trivial publish patch (published jobs); SSOT §7.4. */
export const adminJobPatchPublishBodySchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    descriptionPlain: z.string().max(50_000).optional(),
  })
  .refine((b) => b.title !== undefined || b.descriptionPlain !== undefined, {
    message: 'At least one of title, descriptionPlain is required',
  });

export type AdminJobPatchPublishBody = z.infer<
  typeof adminJobPatchPublishBodySchema
>;
