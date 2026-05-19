-- =============================================================================
-- Migration: 0013_jobs_applications_promo
-- Step 5 — Schema delta C: jobs / applications / resume_assets / promo codes.
--
-- Purpose:
--   Extend the product-loop tables (jobs, applications, resume_assets) with
--   columns the upcoming Steps 7, 9, 10, 11, 12, 13 read/write, plus
--   introduce promo_codes / promo_redemptions for Step 14.
--
-- Decision log (full rationale in
-- /Users/stefanmatic/.cursor/plans/step5-*.plan.md placeholder; for now in
-- the changelog row added to docs/refactor/MIGRATION_PLAN.md):
--   * `application_status` enum is extended additively (`ADD VALUE`) with
--     `viewed` and `shortlisted`. The legacy value `reviewed` is left in
--     place; service code treats it as inert. This avoids a destructive
--     `CREATE TYPE … RENAME` dance.
--   * `applications.cover_letter` is renamed to `cover_letter_text` to match
--     SSOT §8.4 (≤ 1500 chars). Single dev DB so a RENAME COLUMN is safe.
--   * `apply_mode`, `discount_type`, `resume_assets.source` /
--     `template_code` use `text + CHECK` instead of `pgEnum` (extensible
--     pattern matching `vat_treatment` / `packages.code`).
--   * Slug uniqueness is enforced only among `published` rows
--     (`jobs_slug_published_unique` partial unique). Drafts and expired ads
--     can collide / reuse a slug.
--   * Resume primary uniqueness is enforced via partial unique
--     `(candidate_id) WHERE is_primary = true` (hard guarantee, plus
--     service-layer guard for UX-friendly errors).
--   * `applications` previous unique `(job_id, candidate_id)` is replaced
--     by partial unique `(candidate_id, job_id) WHERE status <> 'withdrawn'`
--     so candidates can re-apply after a withdrawal (SSOT §8.5).
--   * `description` (legacy plain text) is kept as-is; FTS index is rebuilt
--     to fall back via `COALESCE(description_plain, description, '')` so the
--     index does not break during the Step 11 backfill window.
--   * `promo_codes.applicable_packages` / `applicable_categories` are
--     `text[]`; `NULL` (or empty) means "applies to all".
--
-- Rollback (manual; in reverse FK order):
--   1. DROP TABLE promo_redemptions.
--   2. DROP TABLE promo_codes.
--   3. ALTER TABLE applications: restore unique, rename column back, drop
--      snapshot columns.
--   4. ALTER TABLE jobs: drop new columns + indexes + checks.
--   5. ALTER TABLE resume_assets: drop new columns + partial unique + checks.
--   6. ALTER TYPE application_status: cannot remove `viewed` / `shortlisted`
--      without recreating the type; leave them.
--   7. Restore previous FTS index.
--
-- Idempotency:
--   `IF NOT EXISTS` guards plus `DO $$ BEGIN … EXCEPTION WHEN
--   duplicate_object/duplicate_column THEN NULL; END $$;` for ALTER TYPE /
--   ADD COLUMN where Postgres lacks `IF NOT EXISTS`.
-- =============================================================================

-- 1) application_status — additive value extension --------------------------

DO $$ BEGIN
  ALTER TYPE "application_status" ADD VALUE 'viewed';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "application_status" ADD VALUE 'shortlisted';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) jobs extensions --------------------------------------------------------

ALTER TABLE "jobs"
  ADD COLUMN IF NOT EXISTS "subscription_id" uuid REFERENCES "public"."subscriptions"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "description_doc"   jsonb,
  ADD COLUMN IF NOT EXISTS "description_html"  text,
  ADD COLUMN IF NOT EXISTS "description_plain" text,
  ADD COLUMN IF NOT EXISTS "primary_language"  text NOT NULL DEFAULT 'sr',
  ADD COLUMN IF NOT EXISTS "slug"              text,
  ADD COLUMN IF NOT EXISTS "short_id"          text,
  ADD COLUMN IF NOT EXISTS "apply_mode"        text NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS "external_apply_url" text,
  ADD COLUMN IF NOT EXISTS "external_apply_clicks" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "featured"          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "crossborder_visible" boolean NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TABLE "jobs"
    ADD CONSTRAINT "jobs_apply_mode_check"
    CHECK ("apply_mode" IN ('internal', 'external'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "jobs"
    ADD CONSTRAINT "jobs_primary_language_check"
    CHECK ("primary_language" IN ('sr', 'en'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Pagination + auto-expiry indexes.
CREATE INDEX IF NOT EXISTS "jobs_status_published_at_idx"
  ON "jobs" ("status", "published_at");
CREATE INDEX IF NOT EXISTS "jobs_status_expires_at_idx"
  ON "jobs" ("status", "expires_at");
-- SEO slug uniqueness only among live ads.
CREATE UNIQUE INDEX IF NOT EXISTS "jobs_slug_published_unique"
  ON "jobs" ("slug") WHERE "status" = 'published';

-- 3) FTS index swap ---------------------------------------------------------
--
-- The existing 0002 index reads only `description` (legacy text column). With
-- Step 11 introducing `description_plain` we want FTS to read the new column,
-- but we cannot break searches during the backfill window. The replacement
-- index COALESCEs the new column, then the legacy column, then '' so existing
-- rows remain searchable until Step 11's backfill runs.

DROP INDEX IF EXISTS "jobs_fts_published_idx";

CREATE INDEX IF NOT EXISTS "jobs_fts_published_idx" ON "jobs" USING gin (
  to_tsvector(
    'simple',
    coalesce("title", '') || ' ' ||
    coalesce("description_plain", "description", '')
  )
) WHERE "status" = 'published';

-- 4) resume_assets extensions -----------------------------------------------

ALTER TABLE "resume_assets"
  ADD COLUMN IF NOT EXISTS "is_primary"    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "source"        text    NOT NULL DEFAULT 'uploaded',
  ADD COLUMN IF NOT EXISTS "template_code" text;

DO $$ BEGIN
  ALTER TABLE "resume_assets"
    ADD CONSTRAINT "resume_assets_source_check"
    CHECK ("source" IN ('uploaded', 'generated'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "resume_assets"
    ADD CONSTRAINT "resume_assets_template_code_check"
    CHECK ("template_code" IS NULL OR "template_code" IN ('klasican', 'moderan', 'minimalan'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Hard guarantee that a candidate has at most one primary CV.
CREATE UNIQUE INDEX IF NOT EXISTS "resume_assets_candidate_primary_unique"
  ON "resume_assets" ("candidate_id") WHERE "is_primary" = true;

-- 5) applications extensions ------------------------------------------------

-- Snapshot columns for filename / storage key (survive resume deletion).
ALTER TABLE "applications"
  ADD COLUMN IF NOT EXISTS "resume_filename"    text,
  ADD COLUMN IF NOT EXISTS "resume_storage_key" text;

-- Rename `cover_letter` → `cover_letter_text` (idempotent: only rename if the
-- legacy name still exists).
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='applications' AND column_name='cover_letter'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='applications' AND column_name='cover_letter_text'
  ) THEN
    ALTER TABLE "applications" RENAME COLUMN "cover_letter" TO "cover_letter_text";
  END IF;
END $$;

-- Drop full-table unique, replace with partial unique allowing re-apply post
-- withdrawal.
DROP INDEX IF EXISTS "applications_job_candidate_unique";

CREATE UNIQUE INDEX IF NOT EXISTS "applications_candidate_job_active_unique"
  ON "applications" ("candidate_id", "job_id") WHERE "status" <> 'withdrawn';

-- 6) promo_codes ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "promo_codes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL,
  "discount_type" text NOT NULL,
  "value" integer NOT NULL DEFAULT 0,
  "valid_from" timestamp with time zone,
  "valid_to" timestamp with time zone,
  "applicable_packages" text[],
  "applicable_categories" text[],
  "max_redemptions" integer,
  "max_per_company" integer,
  "redemptions_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "promo_codes_code_unique"
  ON "promo_codes" ("code");

DO $$ BEGIN
  ALTER TABLE "promo_codes"
    ADD CONSTRAINT "promo_codes_discount_type_check"
    CHECK ("discount_type" IN ('percent', 'fixed', 'full_free'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "promo_codes"
    ADD CONSTRAINT "promo_codes_value_range_check"
    CHECK ((discount_type <> 'percent' AND value >= 0)
           OR (discount_type = 'percent' AND value BETWEEN 0 AND 100));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "promo_codes"
    ADD CONSTRAINT "promo_codes_validity_window_check"
    CHECK (valid_from IS NULL OR valid_to IS NULL OR valid_from <= valid_to);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7) promo_redemptions ------------------------------------------------------

CREATE TABLE IF NOT EXISTS "promo_redemptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "promo_code_id" uuid NOT NULL REFERENCES "public"."promo_codes"("id") ON DELETE RESTRICT,
  "code" text NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "public"."companies"("id") ON DELETE RESTRICT,
  "subscription_id" uuid REFERENCES "public"."subscriptions"("id") ON DELETE SET NULL,
  "redeemed_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "promo_redemptions_promo_code_id_idx"
  ON "promo_redemptions" ("promo_code_id");
CREATE INDEX IF NOT EXISTS "promo_redemptions_company_id_idx"
  ON "promo_redemptions" ("company_id");
CREATE INDEX IF NOT EXISTS "promo_redemptions_subscription_id_idx"
  ON "promo_redemptions" ("subscription_id");
