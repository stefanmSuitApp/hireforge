-- What a matched employer sign-up entered about the company (PIB, MB,
-- address, billing contact). Approval fills only the company's empty
-- columns from it, so a lead staff added by name gets its identifiers.
-- Null for requests created before this.
--
-- Rollback:
--   ALTER TABLE "company_join_requests" DROP COLUMN IF EXISTS "company_input";
ALTER TABLE "company_join_requests" ADD COLUMN IF NOT EXISTS "company_input" jsonb;
