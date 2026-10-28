-- Phase B — single-use email verification and password reset tokens.
-- Only SHA-256 hashes are stored.
--
-- Rollback:
--   DROP TABLE IF EXISTS "auth_tokens";
CREATE TABLE IF NOT EXISTS "auth_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "purpose" text NOT NULL,
  "token_hash" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "used_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "auth_tokens_purpose_check" CHECK ("purpose" IN ('email_verify', 'password_reset'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "auth_tokens_token_hash_unique" ON "auth_tokens" ("token_hash");
CREATE INDEX IF NOT EXISTS "auth_tokens_user_purpose_idx" ON "auth_tokens" ("user_id", "purpose");
