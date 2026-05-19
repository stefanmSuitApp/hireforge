ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "max_active_jobs_override" integer;

ALTER TABLE "packages"
  ADD COLUMN IF NOT EXISTS "title_sr" text,
  ADD COLUMN IF NOT EXISTS "title_en" text,
  ADD COLUMN IF NOT EXISTS "marketing_description_sr" text,
  ADD COLUMN IF NOT EXISTS "marketing_description_en" text;
