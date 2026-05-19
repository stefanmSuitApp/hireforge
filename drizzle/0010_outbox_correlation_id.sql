ALTER TABLE "outbox_events" ADD COLUMN IF NOT EXISTS "correlation_id" text;
