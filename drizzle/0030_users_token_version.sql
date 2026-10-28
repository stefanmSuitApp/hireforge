-- Phase C — refresh tokens carry the user's token_version; bumping it revokes
-- every existing session (password reset, role change). Existing tokens have
-- no version claim and are treated as version 0, so nobody is logged out by
-- this migration.
--
-- Rollback:
--   ALTER TABLE "users" DROP COLUMN IF EXISTS "token_version";
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "token_version" integer DEFAULT 0 NOT NULL;
