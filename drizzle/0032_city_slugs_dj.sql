-- City slugs dropped "đ" (the RS seed's slugify had no đ → dj mapping), so
-- landing URLs read /jobs/city/aran-elovac, /jobs/city/in-ija, … Rebuild those
-- slugs from name_sr the way shared `toAsciiSlug` does: đ → dj, other Serbian
-- diacritics stripped, non-alphanumerics → "-". Jobs and candidates reference
-- cities by id, so nothing else changes. Only rows whose name has đ/Đ.
UPDATE "cities" AS c
SET "slug" = n.slug
FROM (
  SELECT "id",
    trim(BOTH '-' FROM regexp_replace(
      lower(translate(
        replace(replace("name_sr", 'đ', 'dj'), 'Đ', 'Dj'),
        'čćšžČĆŠŽ', 'ccszCCSZ')),
      '[^a-z0-9]+', '-', 'g')) AS slug
  FROM "cities"
  WHERE "name_sr" ~ '[đĐ]'
) AS n
WHERE c."id" = n."id"
  AND n.slug <> ''
  AND NOT EXISTS (
    SELECT 1 FROM "cities" o
    WHERE o."slug" = n.slug AND o."country_code" = c."country_code" AND o."id" <> c."id"
  );
