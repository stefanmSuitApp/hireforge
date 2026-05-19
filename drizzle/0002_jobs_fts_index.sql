-- GIN index for PostgreSQL full-text search on published job title + description.
CREATE INDEX IF NOT EXISTS "jobs_fts_published_idx" ON "jobs" USING gin (
  to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("description", ''))
) WHERE "status" = 'published';
