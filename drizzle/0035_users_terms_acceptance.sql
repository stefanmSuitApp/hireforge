-- C1 — which terms of use a user accepted at sign-up, and when. The version
-- is the published terms' "effective from" date. Null for accounts created
-- before this, or while no terms were published.
--
-- Rollback:
--   ALTER TABLE "users" DROP COLUMN IF EXISTS "terms_version";
--   ALTER TABLE "users" DROP COLUMN IF EXISTS "terms_accepted_at";
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "terms_accepted_at" timestamp with time zone;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "terms_version" text;
