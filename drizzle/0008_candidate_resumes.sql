ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "full_name" text;

CREATE TABLE IF NOT EXISTS "resume_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "resume_assets_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "resume_assets_storage_key_unique" ON "resume_assets" ("storage_key");
CREATE INDEX IF NOT EXISTS "resume_assets_candidate_id_idx" ON "resume_assets" ("candidate_id");

ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "resume_asset_id" uuid;
DO $$ BEGIN
  ALTER TABLE "applications"
    ADD CONSTRAINT "applications_resume_asset_id_resume_assets_id_fk"
    FOREIGN KEY ("resume_asset_id") REFERENCES "resume_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
