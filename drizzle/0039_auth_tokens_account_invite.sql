-- Staff-created employer accounts: an `account_invite` token lets the invited
-- person set their first password (7 days, single use, like the others).
--
-- Rollback (fails while account_invite rows exist; delete them first):
--   ALTER TABLE "auth_tokens" DROP CONSTRAINT IF EXISTS "auth_tokens_purpose_check";
--   ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_purpose_check"
--     CHECK ("purpose" IN ('email_verify', 'password_reset'));
ALTER TABLE "auth_tokens" DROP CONSTRAINT IF EXISTS "auth_tokens_purpose_check";
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_purpose_check"
  CHECK ("purpose" IN ('email_verify', 'password_reset', 'account_invite'));
