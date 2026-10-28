-- Phase B — `jobs.expires_at` was never written on publish, so live paid ads
-- never expired. Backfill per PRODUCT_SSOT §5.2 inv. 3
-- (`published_at + subscription.duration_days_snapshot`). Jobs whose computed
-- date is already past are expired by the worker's next sweep. Jobs without a
-- subscription (legacy / seed) stay without expiry.
--
-- Rollback: not needed (data-only; previous value was NULL for every row).
UPDATE "jobs" AS j
SET "expires_at" = j."published_at" + make_interval(days => s."duration_days_snapshot")
FROM "subscriptions" AS s
WHERE s."id" = j."subscription_id"
  AND j."status" = 'published'
  AND j."expires_at" IS NULL
  AND j."published_at" IS NOT NULL;
