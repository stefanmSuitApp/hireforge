-- Keep the staff audit trail when a staff user is deleted (0034).
-- Before: actor_user_id was ON DELETE CASCADE, so deleting a user erased
-- every audit row of what they did. The column is nullable since 0014; the
-- row now keeps the action with a null actor.
--
-- Rollback:
--   ALTER TABLE "staff_audit_log" DROP CONSTRAINT "staff_audit_log_actor_user_id_users_id_fk";
--   ALTER TABLE "staff_audit_log" ADD CONSTRAINT "staff_audit_log_actor_user_id_users_id_fk"
--     FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
ALTER TABLE "staff_audit_log" DROP CONSTRAINT IF EXISTS "staff_audit_log_actor_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "staff_audit_log" DROP CONSTRAINT IF EXISTS "staff_audit_log_actor_user_id_fkey";
--> statement-breakpoint
ALTER TABLE "staff_audit_log" ADD CONSTRAINT "staff_audit_log_actor_user_id_users_id_fk"
  FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;
