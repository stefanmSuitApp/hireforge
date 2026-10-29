-- Launch job categories (Stefan, 2026-10-29): these ten, in this order,
-- replace the dev-seed `it` and `marketing` on staging and production.
-- `sort_order` drives every category list (search filter, footer, admin);
-- categories added later in the admin sort after these (1000).
-- Jobs keep working: jobs.category_id is ON DELETE SET NULL.
--
-- Rollback:
--   DELETE FROM "job_categories" WHERE "slug" IN ('trgovina-i-prodaja',
--     'proizvodnja', 'usluge-i-zanati', 'ugostiteljstvo-i-turizam',
--     'gradjevinarstvo-i-arhitektura', 'transport-i-logistika',
--     'informacione-tehnologije', 'administracija',
--     'zdravstvo-i-socijalna-zastita', 'finansije-i-racunovodstvo');
--   ALTER TABLE "job_categories" DROP COLUMN IF EXISTS "sort_order";
--   (`it` / `marketing` come back from the pre-release backup if needed.)

ALTER TABLE "job_categories"
  ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 1000;

DELETE FROM "job_categories" WHERE "slug" IN ('it', 'marketing');

INSERT INTO "job_categories" ("slug", "name_sr", "name_en", "sort_order") VALUES
  ('trgovina-i-prodaja', 'Trgovina i prodaja', 'Retail & Sales', 10),
  ('proizvodnja', 'Proizvodnja', 'Manufacturing', 20),
  ('usluge-i-zanati', 'Usluge i zanati', 'Services & Skilled Trades', 30),
  ('ugostiteljstvo-i-turizam', 'Ugostiteljstvo i turizam', 'Hospitality & Tourism', 40),
  ('gradjevinarstvo-i-arhitektura', 'Građevinarstvo i arhitektura', 'Construction & Architecture', 50),
  ('transport-i-logistika', 'Transport i logistika', 'Transportation & Logistics', 60),
  ('informacione-tehnologije', 'Informacione tehnologije', 'Information Technology (IT)', 70),
  ('administracija', 'Administracija', 'Administration & Office Support', 80),
  ('zdravstvo-i-socijalna-zastita', 'Zdravstvo i socijalna zaštita', 'Healthcare & Social Care', 90),
  ('finansije-i-racunovodstvo', 'Finansije i računovodstvo', 'Finance & Accounting', 100)
ON CONFLICT ("slug") DO UPDATE SET
  "name_sr" = EXCLUDED."name_sr",
  "name_en" = EXCLUDED."name_en",
  "sort_order" = EXCLUDED."sort_order";
