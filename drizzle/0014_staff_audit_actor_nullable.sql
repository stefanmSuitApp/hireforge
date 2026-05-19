-- =============================================================================
-- Migration: 0014_staff_audit_actor_nullable
-- Step 6 — CMS sync webhooks need audit rows without a human `users.id`.
--
-- `staff_audit_log.actor_user_id` becomes nullable so `metadata` can carry
-- `{ "actor": "cms_webhook", ... }` while FK still applies when set.
-- =============================================================================

ALTER TABLE "staff_audit_log" ALTER COLUMN "actor_user_id" DROP NOT NULL;
