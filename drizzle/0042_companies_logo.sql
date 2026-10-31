-- Company logos staff upload (uploads storage, area `logo`). The key points
-- at a 256 px square WebP; the timestamp versions the public URL so caches
-- pick up a new logo at once. Null = no logo (Sanity's, or initials).
--
-- Rollback:
--   ALTER TABLE "companies" DROP COLUMN IF EXISTS "logo_updated_at";
--   ALTER TABLE "companies" DROP COLUMN IF EXISTS "logo_storage_key";
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "logo_storage_key" text;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "logo_updated_at" timestamp with time zone;
