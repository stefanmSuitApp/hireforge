-- Step 15 — saved jobs bookmarks + stored search snapshots (job alerts data plumbing).
CREATE TABLE IF NOT EXISTS "saved_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "candidate_id" uuid NOT NULL,
  "job_id" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "saved_jobs_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "saved_jobs_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "saved_jobs_candidate_job_unique" ON "saved_jobs" ("candidate_id", "job_id");
CREATE INDEX IF NOT EXISTS "saved_jobs_candidate_id_idx" ON "saved_jobs" ("candidate_id");

CREATE TABLE IF NOT EXISTS "saved_job_searches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "candidate_id" uuid NOT NULL,
  "query_json" jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "saved_job_searches_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "saved_job_searches_candidate_id_idx" ON "saved_job_searches" ("candidate_id");
