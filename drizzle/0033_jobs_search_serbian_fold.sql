-- Phase D — search that matches how people type Serbian (0033).
-- Before: the list search ignored `description_plain` (editor-authored jobs
-- were not searchable by description), its expression did not match the GIN
-- index (sequential scan on every search), and "inzenjer" / "програмер" did
-- not find "inženjer" / "programer".
--
-- sr_search_fold(): lower-case, Serbian Cyrillic → Latin, ASCII-fold
-- (č/ć→c, š→s, ž→z, đ→dj, љ→lj, њ→nj, џ→dz). IMMUTABLE so it can back an
-- index; the API applies the same function to the query text.
--
-- Rollback:
--   DROP INDEX IF EXISTS "jobs_fts_published_idx";
--   CREATE INDEX "jobs_fts_published_idx" ON "jobs" USING gin (to_tsvector('simple',
--     coalesce("title", '') || ' ' || coalesce("description_plain", "description", '')))
--     WHERE "status" = 'published';
--   DROP FUNCTION IF EXISTS sr_search_fold(text);
-- plpgsql (not plain SQL) on purpose: Postgres inlines SQL functions in
-- queries but not in index expressions, and an inlined query expression no
-- longer matches the index.
CREATE OR REPLACE FUNCTION sr_search_fold(input text) RETURNS text
LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE AS $$
BEGIN
  RETURN translate(
    replace(replace(replace(replace(replace(lower(input),
      'љ', 'lj'), 'њ', 'nj'), 'џ', 'dz'), 'ђ', 'dj'), 'đ', 'dj'),
    'абвгдежзијклмнопрстћуфхцчшčćšž',
    'abvgdezzijklmnoprstcufhccsccsz'
  );
END
$$;

DROP INDEX IF EXISTS "jobs_fts_published_idx";

CREATE INDEX IF NOT EXISTS "jobs_fts_published_idx" ON "jobs" USING gin (
  to_tsvector(
    'simple',
    sr_search_fold(
      coalesce("title", '') || ' ' || coalesce("description_plain", "description", '')
    )
  )
) WHERE "status" = 'published';
