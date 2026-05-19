-- =============================================================================
-- Migration: 0011_companies_billing_and_sales
-- Step 3 — Schema delta A: companies, sales ownership, employers.
--
-- Purpose:
--   * Extend `companies` with foreign-aware billing fields (PIB, MB, VAT ID,
--     Tax ID, address, bank, billing prefs, legal rep) and sales-ownership
--     fields (sales_status, assigned_moderator_id, closed_won_at,
--     closed_lost_at, source).
--   * Add partial unique indexes on `pib`, `mb`, `vat_id` (NULL-friendly).
--   * Add CHECK constraint on `vat_treatment` (`text + CHECK` for P2 SEF/VAT
--     extensibility — avoids `ALTER TYPE ADD VALUE` migrations).
--   * Create `company_assignments_history` for audit of admin reassignments.
--   * Relax `employers` uniqueness from `(user_id)` to `(user_id, company_id)`
--     so the schema is ready for future multi-company support. The MVP
--     "one user ↔ one company" invariant is enforced at the service layer.
--
-- Rollback (manual; in reverse order):
--   1. Restore the old unique on employers.user_id; drop the new composite.
--   2. Drop `company_assignments_history`.
--   3. Drop CHECK + indexes + columns from `companies` in reverse order.
--   4. Drop ENUM types `sales_status`, `company_source` (no remaining refs).
--
-- Idempotency:
--   All statements use `IF NOT EXISTS` / `DO $$ ... EXCEPTION WHEN ...` guards
--   so partial re-runs (e.g. after a failed apply) succeed.
-- =============================================================================

-- 1) New enum types -----------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE "sales_status" AS ENUM ('unassigned', 'pipeline', 'closed_won', 'closed_lost');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "company_source" AS ENUM ('self_signup', 'moderator_lead', 'admin_lead');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) `companies` — billing & foreign-aware fields -----------------------------

DO $$ BEGIN
  ALTER TABLE "companies" ADD COLUMN "is_foreign" boolean NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "companies" ADD COLUMN "country_code" text NOT NULL DEFAULT 'RS';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "companies" ADD COLUMN "pib" text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "companies" ADD COLUMN "mb" text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "companies" ADD COLUMN "vat_id" text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "companies" ADD COLUMN "tax_id" text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "companies" ADD COLUMN "registration_number" text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "companies" ADD COLUMN "address_line_1" text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "companies" ADD COLUMN "address_line_2" text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "companies" ADD COLUMN "address_postal_code" text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "companies" ADD COLUMN "address_city" text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "companies" ADD COLUMN "address_state_region" text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "companies" ADD COLUMN "bank_name" text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "companies" ADD COLUMN "iban" text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "companies" ADD COLUMN "swift_bic" text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "companies" ADD COLUMN "bank_country_code" text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "companies" ADD COLUMN "account_currency" text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "companies" ADD COLUMN "invoice_currency" text NOT NULL DEFAULT 'EUR';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "companies" ADD COLUMN "invoice_language" text NOT NULL DEFAULT 'sr';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "companies" ADD COLUMN "vat_treatment" text NOT NULL DEFAULT 'rs_standard_20';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "companies"
    ADD CONSTRAINT "companies_vat_treatment_check"
    CHECK ("vat_treatment" IN ('rs_standard_20', 'rs_reverse_charge', 'rs_export_no_vat'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "companies" ADD COLUMN "billing_email" text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "companies" ADD COLUMN "billing_phone" text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "companies" ADD COLUMN "billing_contact_name" text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "companies" ADD COLUMN "responsible_person" text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "companies" ADD COLUMN "responsible_position" text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 3) `companies` — sales-ownership fields -------------------------------------

DO $$ BEGIN
  ALTER TABLE "companies" ADD COLUMN "sales_status" "sales_status" NOT NULL DEFAULT 'unassigned';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "companies" ADD COLUMN "assigned_moderator_id" uuid;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "companies"
    ADD CONSTRAINT "companies_assigned_moderator_id_users_id_fk"
    FOREIGN KEY ("assigned_moderator_id") REFERENCES "public"."users"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "companies" ADD COLUMN "closed_won_at" timestamp with time zone;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "companies" ADD COLUMN "closed_lost_at" timestamp with time zone;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "companies" ADD COLUMN "source" "company_source" NOT NULL DEFAULT 'self_signup';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 4) `companies` indexes (partial unique + sales-ownership filters) ----------

CREATE UNIQUE INDEX IF NOT EXISTS "companies_pib_unique"
  ON "companies" ("pib") WHERE "pib" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "companies_mb_unique"
  ON "companies" ("mb") WHERE "mb" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "companies_vat_id_unique"
  ON "companies" ("vat_id") WHERE "vat_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "companies_assigned_moderator_id_idx"
  ON "companies" ("assigned_moderator_id");

CREATE INDEX IF NOT EXISTS "companies_sales_status_idx"
  ON "companies" ("sales_status");

-- 5) `company_assignments_history` -------------------------------------------

CREATE TABLE IF NOT EXISTS "company_assignments_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "public"."companies"("id") ON DELETE CASCADE,
  "from_user_id" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,
  "to_user_id" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,
  "changed_by_admin_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE RESTRICT,
  "reason" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "company_assignments_history_company_created_idx"
  ON "company_assignments_history" ("company_id", "created_at");

-- 6) Relax `employers` uniqueness --------------------------------------------
-- Drop the legacy `(user_id)` unique; replace with composite `(user_id, company_id)`.
-- The MVP single-company invariant is now enforced in the service layer
-- (`apps/api/src/auth/auth.service.ts` -> `EMPLOYER_ALREADY_LINKED`).

DROP INDEX IF EXISTS "employers_user_id_unique";

CREATE UNIQUE INDEX IF NOT EXISTS "employers_user_id_company_id_unique"
  ON "employers" ("user_id", "company_id");
