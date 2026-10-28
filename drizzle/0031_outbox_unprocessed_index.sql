-- Phase C — the worker polls `processed_at IS NULL ORDER BY id` every few
-- seconds; without a partial index that walks every processed row forever.
--
-- Rollback:
--   DROP INDEX IF EXISTS "outbox_events_unprocessed_idx";
CREATE INDEX IF NOT EXISTS "outbox_events_unprocessed_idx" ON "outbox_events" ("id") WHERE "processed_at" IS NULL;
