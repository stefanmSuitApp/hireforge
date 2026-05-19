ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "expiring_soon_notified_at" timestamp with time zone;
