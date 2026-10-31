-- CV templates PR 5b (docs/plans/CV_TEMPLATES.md): the candidate's CV
-- photo, a key in the uploads storage `photo` area (600×600 JPEG). Moderan
-- and Evropski print it when the candidate switches it on.
--
-- Rollback (the files stay in storage; remove them first if wanted):
--   ALTER TABLE "candidates" DROP COLUMN IF EXISTS "photo_storage_key";
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "photo_storage_key" text;
