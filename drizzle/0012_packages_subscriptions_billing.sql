-- =============================================================================
-- Migration: 0012_packages_subscriptions_billing
-- Step 4 — Schema delta B: packages mirror, subscriptions, billing docs.
--
-- Purpose:
--   Introduce the runtime mirror of CMS packages plus subscription, proforma,
--   invoice, credit-note, and billing-sequence counter tables.
--   * `packages`               — CMS-mirrored catalogue. `code` is the natural
--                                 PK with CHECK constraint listing the 4
--                                 stable codes (SSOT §6.1). Extensible without
--                                 `ALTER TYPE` migrations.
--   * `package_prices`         — duration/currency/amount rows; CMS-mirrored.
--   * `package_entitlements`   — capability rows (SSOT §6.3); jsonb value
--                                 supports scalar + structured (editor blob).
--   * `subscriptions`          — authorises publishing (SSOT §5.6). Snapshot
--                                 fields freeze package details at purchase.
--                                 Partial index `(company_id) WHERE status =
--                                 'active'` accelerates SSOT §5.6 active-count
--                                 lookup.
--   * `proformas`              — pre-payment doc (`PR-YYYY/NNNNNN`).
--   * `invoices`               — post-payment doc (`RA-YYYY/NNNNNN`); nullable
--                                 `proforma_id` for GAZDA admin-issued flows;
--                                 `nbs_rate jsonb` snapshot for RS clients.
--   * `credit_notes`           — refund / void doc (`CN-YYYY/NNNNNN`).
--   * `billing_sequences`      — atomic per-(kind, year) counter table. Used
--                                 by Step 9 service via
--                                 `INSERT ... ON CONFLICT (kind, year) DO
--                                 UPDATE SET last_value = last_value + 1
--                                 RETURNING last_value` (row-level lock for TX
--                                 duration → gap-free monotonic sequence).
--
-- Decisions captured here (full rationale in
-- /Users/stefanmatic/.cursor/plans/step4-schema-delta-b_*.plan.md):
--   * `subscriptions.proforma_id` / `invoice_id` are denormalized convenience
--     back-pointers (no FK) to avoid circular FK chains. Authoritative
--     direction is `proformas.subscription_id` / `invoices.subscription_id`.
--   * Money is stored as integer minor units; currency separate `text`
--     (3-letter ISO-4217). No float arithmetic.
--   * `enterprise_admin_unlocked boolean` flips true only for GAZDA, only by
--     admin (Step 9 service-layer rule).
--
-- Rollback (manual; in reverse FK order):
--   1. DROP TABLE billing_sequences.
--   2. DROP TABLE credit_notes.
--   3. DROP TABLE invoices.
--   4. DROP TABLE proformas.
--   5. DROP TABLE subscriptions.
--   6. DROP TABLE package_entitlements.
--   7. DROP TABLE package_prices.
--   8. DROP TABLE packages.
--   9. DROP TYPE subscription_status.
--
-- Idempotency:
--   `IF NOT EXISTS` / `DO $$ ... EXCEPTION WHEN ...` guards consistent with
--   the 0011 pattern; partial re-runs (after a failed apply) succeed.
-- =============================================================================

-- 1) New enum type ------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE "subscription_status" AS ENUM (
    'pending_payment', 'active', 'expired', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) `packages` ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "packages" (
  "code" text PRIMARY KEY,
  "is_active" boolean NOT NULL DEFAULT true,
  "is_enterprise" boolean NOT NULL DEFAULT false,
  "display_order" integer,
  "cms_ref" text,
  "last_synced_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE "packages"
    ADD CONSTRAINT "packages_code_check"
    CHECK ("code" IN ('tezga', 'sljaka', 'sef', 'gazda'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3) `package_prices` ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS "package_prices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "package_code" text NOT NULL REFERENCES "public"."packages"("code") ON DELETE CASCADE,
  "duration_days" integer NOT NULL,
  "amount_minor" integer NOT NULL,
  "currency" text NOT NULL,
  "cms_ref" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "package_prices_package_duration_currency_unique"
  ON "package_prices" ("package_code", "duration_days", "currency");

CREATE INDEX IF NOT EXISTS "package_prices_package_code_idx"
  ON "package_prices" ("package_code");

-- 4) `package_entitlements` ---------------------------------------------------

CREATE TABLE IF NOT EXISTS "package_entitlements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "package_code" text NOT NULL REFERENCES "public"."packages"("code") ON DELETE CASCADE,
  "key" text NOT NULL,
  "value" jsonb NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "package_entitlements_package_key_unique"
  ON "package_entitlements" ("package_code", "key");

CREATE INDEX IF NOT EXISTS "package_entitlements_package_code_idx"
  ON "package_entitlements" ("package_code");

-- 5) `subscriptions` ----------------------------------------------------------

CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "public"."companies"("id") ON DELETE RESTRICT,
  "package_code" text NOT NULL REFERENCES "public"."packages"("code") ON DELETE RESTRICT,
  "package_name_snapshot" text NOT NULL,
  "duration_days_snapshot" integer NOT NULL,
  "price_minor_snapshot" integer NOT NULL,
  "currency_snapshot" text NOT NULL,
  "entitlements_json_snapshot" jsonb NOT NULL,
  "status" "subscription_status" NOT NULL DEFAULT 'pending_payment',
  "starts_at" timestamp with time zone,
  "ends_at" timestamp with time zone,
  "enabled_by_user_id" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,
  "enterprise_admin_unlocked" boolean NOT NULL DEFAULT false,
  -- Denormalized back-pointers (no FK to avoid circular chains).
  "proforma_id" uuid,
  "invoice_id" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "subscriptions_company_id_idx"
  ON "subscriptions" ("company_id");

CREATE INDEX IF NOT EXISTS "subscriptions_package_code_idx"
  ON "subscriptions" ("package_code");

CREATE INDEX IF NOT EXISTS "subscriptions_status_idx"
  ON "subscriptions" ("status");

-- Partial index for SSOT §5.6 active-count lookup; avoids scanning expired rows.
CREATE INDEX IF NOT EXISTS "subscriptions_company_active_idx"
  ON "subscriptions" ("company_id") WHERE "status" = 'active';

-- 6) `proformas` --------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "proformas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "subscription_id" uuid NOT NULL REFERENCES "public"."subscriptions"("id") ON DELETE RESTRICT,
  "number" text NOT NULL,
  "total_minor" integer NOT NULL,
  "currency" text NOT NULL,
  "pdf_storage_key" text,
  "issued_at" timestamp with time zone NOT NULL DEFAULT now(),
  "paid_at" timestamp with time zone,
  "paid_marked_by_user_id" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,
  "voided_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "proformas_number_unique"
  ON "proformas" ("number");

CREATE INDEX IF NOT EXISTS "proformas_subscription_id_idx"
  ON "proformas" ("subscription_id");

-- 7) `invoices` ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "invoices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "subscription_id" uuid NOT NULL REFERENCES "public"."subscriptions"("id") ON DELETE RESTRICT,
  "proforma_id" uuid REFERENCES "public"."proformas"("id") ON DELETE RESTRICT,
  "number" text NOT NULL,
  "total_minor" integer NOT NULL,
  "currency" text NOT NULL,
  "nbs_rate" jsonb,
  "pdf_storage_key" text,
  "issued_at" timestamp with time zone NOT NULL DEFAULT now(),
  "voided_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "invoices_number_unique"
  ON "invoices" ("number");

CREATE INDEX IF NOT EXISTS "invoices_subscription_id_idx"
  ON "invoices" ("subscription_id");

CREATE INDEX IF NOT EXISTS "invoices_proforma_id_idx"
  ON "invoices" ("proforma_id");

-- 8) `credit_notes` -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS "credit_notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "invoice_id" uuid NOT NULL REFERENCES "public"."invoices"("id") ON DELETE RESTRICT,
  "number" text NOT NULL,
  "total_minor" integer NOT NULL,
  "currency" text NOT NULL,
  "reason" text NOT NULL,
  "pdf_storage_key" text,
  "issued_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "credit_notes_number_unique"
  ON "credit_notes" ("number");

CREATE INDEX IF NOT EXISTS "credit_notes_invoice_id_idx"
  ON "credit_notes" ("invoice_id");

-- 9) `billing_sequences` ------------------------------------------------------

CREATE TABLE IF NOT EXISTS "billing_sequences" (
  "kind" text NOT NULL,
  "year" integer NOT NULL,
  "last_value" integer NOT NULL DEFAULT 0,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "billing_sequences_pk" PRIMARY KEY ("kind", "year")
);

DO $$ BEGIN
  ALTER TABLE "billing_sequences"
    ADD CONSTRAINT "billing_sequences_kind_check"
    CHECK ("kind" IN ('proforma', 'invoice', 'credit_note'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
