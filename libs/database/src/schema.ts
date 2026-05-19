import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', [
  'admin',
  'moderator',
  'employer',
  'candidate',
]);

export const jobStatusEnum = pgEnum('job_status', [
  'draft',
  'submitted',
  'published',
  'rejected',
  'archived',
  'expired',
]);

/**
 * Application lifecycle.
 *
 * `reviewed` is a legacy value kept for enum-additive migration safety
 * (Postgres `ALTER TYPE … ADD VALUE` cannot remove values without recreating
 * the type). Service code MUST treat it as inert; the supported lifecycle is
 * `submitted | viewed | shortlisted | rejected | withdrawn | hired`
 * (SSOT §8.2 / Step 5.3).
 */
export const applicationStatusEnum = pgEnum('application_status', [
  'submitted',
  'withdrawn',
  'reviewed',
  'rejected',
  'hired',
  'viewed',
  'shortlisted',
]);

export const workModelEnum = pgEnum('work_model', [
  'onsite',
  'remote',
  'hybrid',
]);

export const employmentTypeEnum = pgEnum('employment_type', [
  'full_time',
  'part_time',
  'contract',
  'internship',
  'temporary',
]);

export const seniorityEnum = pgEnum('seniority_level', [
  'intern',
  'junior',
  'mid',
  'senior',
  'lead',
  'executive',
]);

export const salesStatusEnum = pgEnum('sales_status', [
  'unassigned',
  'pipeline',
  'closed_won',
  'closed_lost',
]);

export const companySourceEnum = pgEnum('company_source', [
  'self_signup',
  'moderator_lead',
  'admin_lead',
]);

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'pending_payment',
  'active',
  'expired',
  'cancelled',
]);

// --- Transactional outbox ---

export const outboxEvents = pgTable('outbox_events', {
  id: serial('id').primaryKey(),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').notNull().$type<Record<string, unknown>>(),
  /** HTTP request id from API ingress (Phase 7.4); propagated to BullMQ `outbox-dispatch` payload. */
  correlationId: text('correlation_id'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
});

/** Terminal BullMQ failures for `outbox-dispatch` (replay / ops visibility). */
export const outboxDeadLetters = pgTable(
  'outbox_dead_letters',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    outboxEventId: integer('outbox_event_id').notNull(),
    bullmqJobId: text('bullmq_job_id').notNull(),
    eventType: text('event_type'),
    payloadSnapshot: jsonb('payload_snapshot').$type<Record<string, unknown>>(),
    errorMessage: text('error_message').notNull(),
    attemptsMade: integer('attempts_made').notNull(),
    stacktrace: text('stacktrace'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('outbox_dead_letters_outbox_event_id_unique').on(
      t.outboxEventId,
    ),
  ],
);

// --- Core entities ---

export const users = pgTable(
  'users',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    email: text('email').notNull(),
    /** Set when the user completes email verification (employer gate — Step 7). */
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    /** bcrypt hash; null for legacy/seed users until they set a password. */
    passwordHash: text('password_hash'),
    /** Optional name shown to employers as “your Šljakam contact” (staff-editable later). */
    publicDisplayName: text('public_display_name'),
    /** Optional phone shown to employers for the assigned moderator. */
    publicPhone: text('public_phone'),
    role: userRoleEnum('role').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex('users_email_unique').on(t.email)],
);

export const companies = pgTable(
  'companies',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    slug: text('slug').notNull(),
    legalName: text('legal_name').notNull(),
    /** When set, the company is treated as verified for trust signals. */
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    verifiedByUserId: uuid('verified_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    /** Domestic (`RS`) vs foreign company. Drives conditional billing field requirements at the app layer. */
    isForeign: boolean('is_foreign').notNull().default(false),
    /** ISO-3166 alpha-2. Defaults to `RS`; foreign companies set their actual country. */
    countryCode: text('country_code').notNull().default('RS'),
    /** Tax ID for RS companies (8 digits). Partial unique when not null. */
    pib: text('pib'),
    /** Company registration number for RS (8 digits). Partial unique when not null. */
    mb: text('mb'),
    /** EU VAT identifier (e.g. `DE123456789`). Partial unique when not null. */
    vatId: text('vat_id'),
    /** Foreign tax authority identifier for non-EU companies. */
    taxId: text('tax_id'),
    /** Foreign companies house / equivalent registration number. */
    registrationNumber: text('registration_number'),
    addressLine1: text('address_line_1'),
    addressLine2: text('address_line_2'),
    addressPostalCode: text('address_postal_code'),
    addressCity: text('address_city'),
    addressStateRegion: text('address_state_region'),
    bankName: text('bank_name'),
    iban: text('iban'),
    swiftBic: text('swift_bic'),
    bankCountryCode: text('bank_country_code'),
    accountCurrency: text('account_currency'),
    /** ISO-4217. RSD for domestic, EUR/USD for foreign. */
    invoiceCurrency: text('invoice_currency').notNull().default('EUR'),
    /** `sr` for domestic, `sr` or `en` for foreign. */
    invoiceLanguage: text('invoice_language').notNull().default('sr'),
    /** VAT regime. `text + CHECK` for P2 SEF/VAT extensibility (avoids `ALTER TYPE` migrations). */
    vatTreatment: text('vat_treatment').notNull().default('rs_standard_20'),
    billingEmail: text('billing_email'),
    billingPhone: text('billing_phone'),
    billingContactName: text('billing_contact_name'),
    /** Legal representative (Serbian invoicing requirement). */
    responsiblePerson: text('responsible_person'),
    /** Legal representative position / title. */
    responsiblePosition: text('responsible_position'),
    salesStatus: salesStatusEnum('sales_status')
      .notNull()
      .default('unassigned'),
    /** Moderator owning the account. Only an admin can reassign once `sales_status = closed_won`. */
    assignedModeratorId: uuid('assigned_moderator_id').references(
      () => users.id,
      { onDelete: 'set null' },
    ),
    closedWonAt: timestamp('closed_won_at', { withTimezone: true }),
    closedLostAt: timestamp('closed_lost_at', { withTimezone: true }),
    /**
     * Provenance of the company row.
     * Default `self_signup` keeps historical / dev-fixture rows valid; new code paths set explicitly.
     */
    source: companySourceEnum('source').notNull().default('self_signup'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('companies_slug_unique').on(t.slug),
    uniqueIndex('companies_pib_unique')
      .on(t.pib)
      .where(sql`${t.pib} IS NOT NULL`),
    uniqueIndex('companies_mb_unique')
      .on(t.mb)
      .where(sql`${t.mb} IS NOT NULL`),
    uniqueIndex('companies_vat_id_unique')
      .on(t.vatId)
      .where(sql`${t.vatId} IS NOT NULL`),
    index('companies_assigned_moderator_id_idx').on(t.assignedModeratorId),
    index('companies_sales_status_idx').on(t.salesStatus),
    check(
      'companies_vat_treatment_check',
      sql`${t.vatTreatment} IN ('rs_standard_20', 'rs_reverse_charge', 'rs_export_no_vat')`,
    ),
  ],
);

/** Staff actions for admin visibility (moderator + admin where applicable). */
export const staffAuditLog = pgTable(
  'staff_audit_log',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    /**
     * Human staff actor when present; `NULL` for automated writers (e.g. CMS
     * package sync webhook / scheduled reconcile — Step 6).
     */
    actorUserId: uuid('actor_user_id').references(() => users.id, {
      onDelete: 'cascade',
    }),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('staff_audit_log_created_at_idx').on(t.createdAt),
    index('staff_audit_log_entity_idx').on(t.entityType, t.entityId),
  ],
);

/**
 * Audit trail for sales-ownership reassignments.
 * Written by admin reassign endpoint (Step 8); used by company detail history view.
 */
export const companyAssignmentsHistory = pgTable(
  'company_assignments_history',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    fromUserId: uuid('from_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    toUserId: uuid('to_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    changedByAdminId: uuid('changed_by_admin_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    reason: text('reason').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('company_assignments_history_company_created_idx').on(
      t.companyId,
      t.createdAt,
    ),
  ],
);

/**
 * Employer membership.
 *
 * Schema allows multiple `(user_id, company_id)` rows so future multi-company
 * support requires no migration. The MVP "one user ↔ one company" invariant is
 * enforced at the service layer (see `apps/api/src/auth/auth.service.ts`).
 */
export const employers = pgTable(
  'employers',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('employers_user_id_company_id_unique').on(
      t.userId,
      t.companyId,
    ),
  ],
);

export const candidates = pgTable(
  'candidates',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Display name for applications and profile (optional at signup). */
    fullName: text('full_name'),
    /** SSOT §9.1 — optional contact for CV / profile. */
    phone: text('phone'),
    /** SSOT §9.1 — short tagline (app-validated ≤80 chars). */
    headline: text('headline'),
    /** SSOT §9.1 — optional home city for CV header (`cities.id`; FK in migrations). */
    cityId: uuid('city_id'),
    /**
     * Structured CV builder payload (experiences, education, skills).
     * Zod-validated in API; default empty object.
     */
    cvProfile: jsonb('cv_profile')
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('candidates_user_id_unique').on(t.userId),
    index('candidates_city_id_idx').on(t.cityId),
  ],
);

/** CV uploaded by candidate; file bytes live on disk/S3 under `storageKey`. */
export const resumeAssets = pgTable(
  'resume_assets',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    candidateId: uuid('candidate_id')
      .notNull()
      .references(() => candidates.id, { onDelete: 'cascade' }),
    storageKey: text('storage_key').notNull(),
    originalFilename: text('original_filename').notNull(),
    mimeType: text('mime_type').notNull(),
    byteSize: integer('byte_size').notNull(),
    /**
     * MVP rule: at most one primary CV per candidate. Hard-enforced by partial
     * unique index `(candidate_id) WHERE is_primary = true`; service layer also
     * sets exactly one to true on upload (SSOT §9.4).
     */
    isPrimary: boolean('is_primary').notNull().default(true),
    /** `uploaded` (PDF/DOCX upload) or `generated` (templated render). */
    source: text('source').notNull().default('uploaded'),
    /** Template code, populated when source = 'generated' (SSOT §9.5). */
    templateCode: text('template_code'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('resume_assets_storage_key_unique').on(t.storageKey),
    index('resume_assets_candidate_id_idx').on(t.candidateId),
    /** Hard guarantee that a candidate has at most one primary CV. */
    uniqueIndex('resume_assets_candidate_primary_unique')
      .on(t.candidateId)
      .where(sql`${t.isPrimary} = true`),
    check(
      'resume_assets_source_check',
      sql`${t.source} IN ('uploaded', 'generated')`,
    ),
    check(
      'resume_assets_template_code_check',
      sql`${t.templateCode} IS NULL OR ${t.templateCode} IN ('klasican', 'moderan', 'minimalan')`,
    ),
  ],
);

// --- Taxonomy ---

/** Serbian administrative district (okrug / grad) — curated list; `slug` is stable id. */
export const districts = pgTable('districts', {
  slug: text('slug').primaryKey(),
  nameSr: text('name_sr').notNull(),
  nameEn: text('name_en'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Job location: statutory city (`is_city`) or municipality (`is_city` false); same table. */
export const cities = pgTable(
  'cities',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    slug: text('slug').notNull(),
    countryCode: text('country_code').notNull().default('RS'),
    nameSr: text('name_sr').notNull(),
    nameEn: text('name_en'),
    districtSlug: text('district_slug').references(() => districts.slug, {
      onDelete: 'set null',
    }),
    isCity: boolean('is_city').notNull().default(true),
    /** Serbia PTT (e.g. central post office for the settlement). */
    postalCode: text('postal_code'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('cities_slug_country_unique').on(t.slug, t.countryCode),
    index('cities_district_slug_idx').on(t.districtSlug),
    index('cities_postal_code_idx').on(t.postalCode),
  ],
);

export const jobCategories = pgTable(
  'job_categories',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    slug: text('slug').notNull(),
    nameSr: text('name_sr').notNull(),
    nameEn: text('name_en'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex('job_categories_slug_unique').on(t.slug)],
);

// --- Jobs & applications ---

export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    /**
     * Authorising subscription. Nullable for legacy / pre-Step 9 rows; once
     * Step 9 ships, all newly-created jobs MUST link to a subscription.
     */
    subscriptionId: uuid('subscription_id').references(() => subscriptions.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    /**
     * Legacy plain-text description column kept for backward compatibility
     * during Step 11 (TipTap rollout). New writes should populate
     * `description_doc` / `description_html` / `description_plain`; the FTS
     * index falls back to this column via `COALESCE` until backfill completes.
     */
    description: text('description').notNull().default(''),
    /** Canonical ProseMirror document (TipTap output). */
    descriptionDoc: jsonb('description_doc'),
    /** Sanitised HTML projection cached server-side; rendered to clients. */
    descriptionHtml: text('description_html'),
    /** Plain-text projection used by the FTS index and Glassdoor-style excerpts. */
    descriptionPlain: text('description_plain'),
    /** Authoring language (`sr | en`). */
    primaryLanguage: text('primary_language').notNull().default('sr'),
    /**
     * SEO slug (e.g. `senior-react-developer`). Unique only among `published`
     * rows (partial unique index); drafts and expired ads can reuse a slug.
     */
    slug: text('slug'),
    /** Short non-guessable suffix for collision-free public URLs. */
    shortId: text('short_id'),
    status: jobStatusEnum('status').notNull().default('draft'),
    /** `internal` (apply via Šljakam) or `external` (redirect to employer URL). */
    applyMode: text('apply_mode').notNull().default('internal'),
    /** Redirect target for `external` apply mode. App-level enforces `https://`. */
    externalApplyUrl: text('external_apply_url'),
    /** Click counter for `external` apply tracking (SSOT §8.3). */
    externalApplyClicks: integer('external_apply_clicks').notNull().default(0),
    cityId: uuid('city_id').references(() => cities.id, {
      onDelete: 'set null',
    }),
    categoryId: uuid('category_id').references(() => jobCategories.id, {
      onDelete: 'set null',
    }),
    workModel: workModelEnum('work_model').notNull().default('hybrid'),
    employmentType: employmentTypeEnum('employment_type')
      .notNull()
      .default('full_time'),
    seniority: seniorityEnum('seniority').notNull().default('mid'),
    /** ŠEF/GAZDA package perk: pinned in search results (SSOT §6.3). */
    featured: boolean('featured').notNull().default(false),
    /** Visible to candidates outside RS (ŠEF/GAZDA only per SSOT §6.3). */
    crossborderVisible: boolean('crossborder_visible').notNull().default(false),
    /** PNG creative URL when package entitles `png_creative` (employer-supplied https asset). */
    pngCreativeUrl: text('png_creative_url'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    rejectedReason: text('rejected_reason'),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    /** Set when `job_expiring_soon` outbox event is written (worker idempotency, Step 10.3). */
    expiringSoonNotifiedAt: timestamp('expiring_soon_notified_at', {
      withTimezone: true,
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('jobs_company_id_idx').on(t.companyId),
    index('jobs_status_idx').on(t.status),
    index('jobs_city_id_idx').on(t.cityId),
    /** Public listing pagination (`status='published'` + sort by published_at). */
    index('jobs_status_published_at_idx').on(t.status, t.publishedAt),
    /** Auto-expiry worker scan (Step 7.3 / SSOT §7.3). */
    index('jobs_status_expires_at_idx').on(t.status, t.expiresAt),
    /** SEO slug uniqueness only among live ads; drafts/expired can collide. */
    uniqueIndex('jobs_slug_published_unique')
      .on(t.slug)
      .where(sql`${t.status} = 'published'`),
    check(
      'jobs_apply_mode_check',
      sql`${t.applyMode} IN ('internal', 'external')`,
    ),
    check(
      'jobs_primary_language_check',
      sql`${t.primaryLanguage} IN ('sr', 'en')`,
    ),
  ],
);

/** Inlined job description imagery (TipTap `image` nodes; Step 11.6). */
export const jobDescriptionMedia = pgTable(
  'job_description_media',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    /** Relative key inside the configured storage root / bucket prefix. */
    storageKey: text('storage_key').notNull(),
    mimeType: text('mime_type').notNull().default('image/avif'),
    bytes: integer('bytes').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('job_description_media_job_id_idx').on(t.jobId)],
);

export const applications = pgTable(
  'applications',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    candidateId: uuid('candidate_id')
      .notNull()
      .references(() => candidates.id, { onDelete: 'cascade' }),
    /** CV attached to this application; delete resume is blocked while referenced. */
    resumeAssetId: uuid('resume_asset_id').references(() => resumeAssets.id, {
      onDelete: 'restrict',
    }),
    /**
     * Frozen filename / storage key snapshot at apply-time. Survives later
     * employer file deletes (audit trail).
     */
    resumeFilename: text('resume_filename'),
    resumeStorageKey: text('resume_storage_key'),
    status: applicationStatusEnum('status').notNull().default('submitted'),
    /** Free-form cover letter, app-validated to ≤ 1500 chars (SSOT §8.4). */
    coverLetterText: text('cover_letter_text'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    /**
     * Re-application allowed only after a `withdrawn` close-out (SSOT §8.5).
     * Partial unique encodes the rule at the DB layer; service code may add
     * UX-friendly errors on top.
     */
    uniqueIndex('applications_candidate_job_active_unique')
      .on(t.candidateId, t.jobId)
      .where(sql`${t.status} <> 'withdrawn'`),
    index('applications_job_id_idx').on(t.jobId),
  ],
);

/** Candidate bookmarks for Glassdoor-style saved jobs (Step 15). */
export const savedJobs = pgTable(
  'saved_jobs',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    candidateId: uuid('candidate_id')
      .notNull()
      .references(() => candidates.id, { onDelete: 'cascade' }),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('saved_jobs_candidate_job_unique').on(t.candidateId, t.jobId),
    index('saved_jobs_candidate_id_idx').on(t.candidateId),
  ],
);

/**
 * Stored filter snapshots for future job-alert delivery (Step 15 — alerts P2).
 * `query_json` mirrors public jobs list query params as string values.
 */
export const savedJobSearches = pgTable(
  'saved_job_searches',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    candidateId: uuid('candidate_id')
      .notNull()
      .references(() => candidates.id, { onDelete: 'cascade' }),
    queryJson: jsonb('query_json')
      .notNull()
      .$type<Record<string, string>>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('saved_job_searches_candidate_id_idx').on(t.candidateId),
  ],
);

// --- Packages, subscriptions, billing (Step 4) ---

/**
 * CMS-mirrored package catalogue.
 *
 * `code` is the natural primary key — stable across CMS edits and shipped
 * versions. CHECK constraint enforces the 4 stable codes from SSOT §6.1; new
 * codes ship via a one-line migration (extensible without `ALTER TYPE`).
 */
export const packages = pgTable(
  'packages',
  {
    code: text('code').primaryKey(),
    isActive: boolean('is_active').notNull().default(true),
    isEnterprise: boolean('is_enterprise').notNull().default(false),
    displayOrder: integer('display_order'),
    /** Sanity document `_id` for trace; populated by Step 6 sync. */
    cmsRef: text('cms_ref'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    /** CMS marketing (optional); when null, web uses static i18n. */
    titleSr: text('title_sr'),
    titleEn: text('title_en'),
    marketingDescriptionSr: text('marketing_description_sr'),
    marketingDescriptionEn: text('marketing_description_en'),
    /**
     * CMS sync: array of `{ featureKey, messageSr?, messageEn? }` for package-card
     * upgrade hints (Step 9.5).
     */
    upgradeMessages: jsonb('upgrade_messages').$type<
      Array<{
        featureKey: string;
        messageSr?: string;
        messageEn?: string;
      }>
    >(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      'packages_code_check',
      sql`${t.code} IN ('tezga', 'sljaka', 'sef', 'gazda')`,
    ),
  ],
);

export const packagePrices = pgTable(
  'package_prices',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    packageCode: text('package_code')
      .notNull()
      .references(() => packages.code, { onDelete: 'cascade' }),
    durationDays: integer('duration_days').notNull(),
    /** Amount in minor units (e.g. 3000 = 30.00 EUR). Avoid float math. */
    amountMinor: integer('amount_minor').notNull(),
    currency: text('currency').notNull(),
    cmsRef: text('cms_ref'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('package_prices_package_duration_currency_unique').on(
      t.packageCode,
      t.durationDays,
      t.currency,
    ),
    index('package_prices_package_code_idx').on(t.packageCode),
  ],
);

/**
 * Per-package entitlement rows, keyed by stable convention names from SSOT §6.3.
 *
 * `value` is jsonb so scalar (`max_active_jobs: 1`) and structured
 * (`editor: { bold: true, ... }`) values fit the same shape.
 */
export const packageEntitlements = pgTable(
  'package_entitlements',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    packageCode: text('package_code')
      .notNull()
      .references(() => packages.code, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    value: jsonb('value').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('package_entitlements_package_key_unique').on(
      t.packageCode,
      t.key,
    ),
    index('package_entitlements_package_code_idx').on(t.packageCode),
  ],
);

/**
 * Subscription = the only thing that authorises publishing a job ad (SSOT §5.6).
 *
 * Snapshot fields freeze package details at purchase. CMS edits to package
 * prices/entitlements after purchase NEVER affect existing subscriptions —
 * critical for legal invoice immutability.
 */
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'restrict' }),
    packageCode: text('package_code')
      .notNull()
      .references(() => packages.code, { onDelete: 'restrict' }),
    /** Display-name snapshot (e.g. "TEZGA"). Frozen at purchase. */
    packageNameSnapshot: text('package_name_snapshot').notNull(),
    durationDaysSnapshot: integer('duration_days_snapshot').notNull(),
    priceMinorSnapshot: integer('price_minor_snapshot').notNull(),
    currencySnapshot: text('currency_snapshot').notNull(),
    /** Full entitlements blob (see SSOT §6.3) frozen at purchase. */
    entitlementsJsonSnapshot: jsonb('entitlements_json_snapshot')
      .notNull()
      .$type<Record<string, unknown>>(),
    status: subscriptionStatusEnum('status')
      .notNull()
      .default('pending_payment'),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    /** Moderator/admin who marked paid / activated. */
    enabledByUserId: uuid('enabled_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    /** GAZDA enterprise unlock; only an admin sets this. */
    enterpriseAdminUnlocked: boolean('enterprise_admin_unlocked')
      .notNull()
      .default(false),
    /**
     * Denormalized convenience back-pointers (NOT FK) to avoid circular FK
     * chains. Authoritative direction is `proformas.subscription_id` /
     * `invoices.subscription_id` (those have FK).
     */
    proformaId: uuid('proforma_id'),
    invoiceId: uuid('invoice_id'),
    /**
     * Ops override of concurrent listing cap for SEF/GAZDA (SSOT §6.3).
     * When set, replaces `entitlements_json_snapshot.max_active_jobs` for gating only.
     */
    maxActiveJobsOverride: integer('max_active_jobs_override'),
    /** Promo code text snapshot when checkout used Step 14 promo; null otherwise. */
    appliedPromoCode: text('applied_promo_code'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('subscriptions_company_id_idx').on(t.companyId),
    index('subscriptions_package_code_idx').on(t.packageCode),
    index('subscriptions_status_idx').on(t.status),
    /** Partial index for SSOT §5.6 active-count check; avoids scanning expired rows. */
    index('subscriptions_company_active_idx')
      .on(t.companyId)
      .where(sql`${t.status} = 'active'`),
  ],
);

export const proformas = pgTable(
  'proformas',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    subscriptionId: uuid('subscription_id')
      .notNull()
      .references(() => subscriptions.id, { onDelete: 'restrict' }),
    /** Format: `PR-YYYY/NNNNNN`. Allocated atomically via `billing_sequences`. */
    number: text('number').notNull(),
    totalMinor: integer('total_minor').notNull(),
    currency: text('currency').notNull(),
    pdfStorageKey: text('pdf_storage_key'),
    issuedAt: timestamp('issued_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    paidMarkedByUserId: uuid('paid_marked_by_user_id').references(
      () => users.id,
      { onDelete: 'set null' },
    ),
    voidedAt: timestamp('voided_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('proformas_number_unique').on(t.number),
    index('proformas_subscription_id_idx').on(t.subscriptionId),
  ],
);

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    subscriptionId: uuid('subscription_id')
      .notNull()
      .references(() => subscriptions.id, { onDelete: 'restrict' }),
    /** Source proforma (nullable for GAZDA admin-issued flows). */
    proformaId: uuid('proforma_id').references(() => proformas.id, {
      onDelete: 'restrict',
    }),
    /** Format: `RA-YYYY/NNNNNN`. */
    number: text('number').notNull(),
    totalMinor: integer('total_minor').notNull(),
    currency: text('currency').notNull(),
    /** NBS middle-rate snapshot for RS clients (`{ rate, source_url, fetched_at, base_currency, target_currency }`). */
    nbsRate: jsonb('nbs_rate').$type<Record<string, unknown>>(),
    pdfStorageKey: text('pdf_storage_key'),
    issuedAt: timestamp('issued_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    voidedAt: timestamp('voided_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('invoices_number_unique').on(t.number),
    index('invoices_subscription_id_idx').on(t.subscriptionId),
    index('invoices_proforma_id_idx').on(t.proformaId),
  ],
);

export const creditNotes = pgTable(
  'credit_notes',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'restrict' }),
    /** Format: `CN-YYYY/NNNNNN`. */
    number: text('number').notNull(),
    /** Positive amount being credited (refund / void). */
    totalMinor: integer('total_minor').notNull(),
    currency: text('currency').notNull(),
    reason: text('reason').notNull(),
    pdfStorageKey: text('pdf_storage_key'),
    issuedAt: timestamp('issued_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('credit_notes_number_unique').on(t.number),
    index('credit_notes_invoice_id_idx').on(t.invoiceId),
  ],
);

/**
 * Atomic per-(kind, year) counter for billing document numbers.
 *
 * Allocation pattern (Step 9 service will use):
 *   INSERT INTO billing_sequences (kind, year, last_value)
 *   VALUES ($1, $2, 1)
 *   ON CONFLICT (kind, year) DO UPDATE
 *     SET last_value = billing_sequences.last_value + 1, updated_at = now()
 *   RETURNING last_value;
 *
 * `ON CONFLICT DO UPDATE` takes a row-level lock for the duration of the TX,
 * giving a gap-free monotonic sequence without `ALTER TYPE`-style DDL.
 */
export const billingSequences = pgTable(
  'billing_sequences',
  {
    kind: text('kind').notNull(),
    year: integer('year').notNull(),
    lastValue: integer('last_value').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({
      name: 'billing_sequences_pk',
      columns: [t.kind, t.year],
    }),
    check(
      'billing_sequences_kind_check',
      sql`${t.kind} IN ('proforma', 'invoice', 'credit_note')`,
    ),
  ],
);

// --- Promo codes (Step 5) ---

/**
 * Promo code catalogue (Step 14 fills marketing campaigns).
 *
 * `discount_type` is `text + CHECK` for extensibility; new variants ship via a
 * one-line migration (no `ALTER TYPE`). `applicable_packages` /
 * `applicable_categories` use Postgres `text[]` so a single row can apply to a
 * subset of the catalogue without a join table; `NULL` (or empty) means
 * "applies to all".
 *
 * `max_redemptions` and `max_per_company` are enforced at the service layer
 * (Step 9 / 14) via SELECT-then-INSERT in a TX; no DB CHECK because race-safe
 * counters need atomic increments anyway.
 */
export const promoCodes = pgTable(
  'promo_codes',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    code: text('code').notNull(),
    /** `percent` (value=0..100), `fixed` (value=minor units), `full_free` (value ignored). */
    discountType: text('discount_type').notNull(),
    /** Discount magnitude. Interpretation depends on `discount_type`. */
    value: integer('value').notNull().default(0),
    validFrom: timestamp('valid_from', { withTimezone: true }),
    validTo: timestamp('valid_to', { withTimezone: true }),
    /** `NULL` ⇒ all packages eligible. */
    applicablePackages: text('applicable_packages').array(),
    /** `NULL` ⇒ all categories eligible. */
    applicableCategories: text('applicable_categories').array(),
    maxRedemptions: integer('max_redemptions'),
    maxPerCompany: integer('max_per_company'),
    /** Denormalized counter; service increments on redemption inside TX. */
    redemptionsCount: integer('redemptions_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('promo_codes_code_unique').on(t.code),
    check(
      'promo_codes_discount_type_check',
      sql`${t.discountType} IN ('percent', 'fixed', 'full_free')`,
    ),
    /** A `percent` discount must be 0..100; other types only require non-negative. */
    check(
      'promo_codes_value_range_check',
      sql`(${t.discountType} <> 'percent' AND ${t.value} >= 0)
          OR (${t.discountType} = 'percent' AND ${t.value} BETWEEN 0 AND 100)`,
    ),
    check(
      'promo_codes_validity_window_check',
      sql`${t.validFrom} IS NULL OR ${t.validTo} IS NULL OR ${t.validFrom} <= ${t.validTo}`,
    ),
  ],
);

/**
 * One row per redemption. `(code, company_id)` partial unique would let us
 * encode `max_per_company = 1` at the DB layer, but since the cap varies per
 * promo (`max_per_company` is an integer column), we enforce in service code.
 */
export const promoRedemptions = pgTable(
  'promo_redemptions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    promoCodeId: uuid('promo_code_id')
      .notNull()
      .references(() => promoCodes.id, { onDelete: 'restrict' }),
    /** Snapshot of the code text used; survives a code rename / void. */
    code: text('code').notNull(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'restrict' }),
    subscriptionId: uuid('subscription_id').references(() => subscriptions.id, {
      onDelete: 'set null',
    }),
    redeemedAt: timestamp('redeemed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('promo_redemptions_promo_code_id_idx').on(t.promoCodeId),
    index('promo_redemptions_company_id_idx').on(t.companyId),
    index('promo_redemptions_subscription_id_idx').on(t.subscriptionId),
  ],
);
