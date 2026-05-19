-- Step 11.6: inlined images inside employer job TipTap descriptions (AVIF blobs on disk/S3).

CREATE TABLE IF NOT EXISTS job_description_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  job_id UUID NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  storage_key TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/avif',
  bytes INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_description_media_job_id_idx ON job_description_media (job_id);
