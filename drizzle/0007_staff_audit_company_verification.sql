DO $$ BEGIN
  ALTER TABLE "companies" ADD COLUMN "verified_at" timestamp with time zone;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "companies" ADD COLUMN "verified_by_user_id" uuid;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "companies" ADD CONSTRAINT "companies_verified_by_user_id_users_id_fk" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "staff_audit_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "staff_audit_log_created_at_idx" ON "staff_audit_log" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "staff_audit_log_entity_idx" ON "staff_audit_log" USING btree ("entity_type", "entity_id");
