-- Go-to-market G0 WP-A5 (docs/plans/GO_TO_MARKET_REVIEW.md): apply by phone
-- (call and Viber) or e-mail, and a per-day counter table for the employer's
-- stats (contact taps now; views and external clicks in WP-A6).
--
-- Rollback (phone/e-mail jobs must be switched to internal first):
--   DROP TABLE IF EXISTS "job_daily_stats";
--   ALTER TABLE "jobs" DROP CONSTRAINT IF EXISTS "jobs_apply_contact_check";
--   ALTER TABLE "jobs" DROP COLUMN IF EXISTS "apply_phone",
--     DROP COLUMN IF EXISTS "apply_email";
--   ALTER TABLE "jobs" DROP CONSTRAINT IF EXISTS "jobs_apply_mode_check";
--   ALTER TABLE "jobs" ADD CONSTRAINT "jobs_apply_mode_check"
--     CHECK ("apply_mode" IN ('internal', 'external'));
ALTER TABLE "jobs" DROP CONSTRAINT IF EXISTS "jobs_apply_mode_check";
--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_apply_mode_check"
  CHECK ("apply_mode" IN ('internal', 'external', 'phone', 'email'));
--> statement-breakpoint
ALTER TABLE "jobs"
  ADD COLUMN IF NOT EXISTS "apply_phone" text,
  ADD COLUMN IF NOT EXISTS "apply_email" text;
--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_apply_contact_check" CHECK (
  ("apply_mode" <> 'phone' OR "apply_phone" IS NOT NULL)
  AND ("apply_mode" <> 'email' OR "apply_email" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job_daily_stats" (
  "job_id" uuid NOT NULL REFERENCES "jobs"("id") ON DELETE CASCADE,
  -- Belgrade calendar day.
  "day" date NOT NULL,
  "views" integer NOT NULL DEFAULT 0,
  "external_clicks" integer NOT NULL DEFAULT 0,
  "calls" integer NOT NULL DEFAULT 0,
  "viber" integer NOT NULL DEFAULT 0,
  "emails" integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("job_id", "day")
);
