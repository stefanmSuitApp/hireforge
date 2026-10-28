-- Phase A — employer signups that match an existing company wait for staff
-- approval instead of being linked automatically (company takeover fix).
--
-- Rollback:
--   DROP TABLE IF EXISTS "company_join_requests";
CREATE TABLE IF NOT EXISTS "company_join_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "decided_by_user_id" uuid,
  "decided_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "company_join_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "company_join_requests_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "company_join_requests_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "company_join_requests_status_check" CHECK ("status" IN ('pending', 'approved', 'rejected'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "company_join_requests_user_pending_unique" ON "company_join_requests" ("user_id") WHERE "status" = 'pending';
CREATE INDEX IF NOT EXISTS "company_join_requests_company_status_idx" ON "company_join_requests" ("company_id", "status");
