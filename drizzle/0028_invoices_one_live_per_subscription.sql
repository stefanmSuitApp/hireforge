-- Phase B — backstop for the mark-paid race: at most one live (non-voided)
-- invoice per subscription. The service also row-locks the subscription.
--
-- Rollback:
--   DROP INDEX IF EXISTS "invoices_subscription_live_unique";
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_subscription_live_unique" ON "invoices" ("subscription_id") WHERE "voided_at" IS NULL;
