-- Go-to-market G0 WP-A4 (docs/plans/GO_TO_MARKET_REVIEW.md): optional salary
-- on every job, in whole RSD. A range, a floor ("od") or a ceiling ("do");
-- period month / day / hour; net (the Serbian default) or gross.
--
-- Rollback:
--   ALTER TABLE "jobs" DROP CONSTRAINT IF EXISTS "jobs_salary_check";
--   ALTER TABLE "jobs" DROP COLUMN IF EXISTS "salary_min",
--     DROP COLUMN IF EXISTS "salary_max", DROP COLUMN IF EXISTS "salary_period",
--     DROP COLUMN IF EXISTS "salary_basis";
ALTER TABLE "jobs"
  ADD COLUMN IF NOT EXISTS "salary_min" integer,
  ADD COLUMN IF NOT EXISTS "salary_max" integer,
  ADD COLUMN IF NOT EXISTS "salary_period" text,
  ADD COLUMN IF NOT EXISTS "salary_basis" text;
--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_salary_check" CHECK (
  ("salary_min" IS NULL AND "salary_max" IS NULL AND "salary_period" IS NULL AND "salary_basis" IS NULL)
  OR (
    ("salary_min" IS NOT NULL OR "salary_max" IS NOT NULL)
    AND ("salary_min" IS NULL OR "salary_min" > 0)
    AND ("salary_max" IS NULL OR "salary_max" > 0)
    AND ("salary_min" IS NULL OR "salary_max" IS NULL OR "salary_min" <= "salary_max")
    -- IS NOT NULL: NULL IN (…) is NULL, and a NULL check passes.
    AND "salary_period" IS NOT NULL AND "salary_period" IN ('month', 'day', 'hour')
    AND "salary_basis" IS NOT NULL AND "salary_basis" IN ('net', 'gross')
  )
);
