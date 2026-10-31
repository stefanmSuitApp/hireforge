-- CV templates (docs/plans/CV_TEMPLATES.md): two new generated-CV templates,
-- `evropski` (European format) and `prakticni` (skills first).
--
-- Rollback (fails while resume_assets rows use a new code; delete or
-- regenerate those first):
--   ALTER TABLE "resume_assets" DROP CONSTRAINT IF EXISTS "resume_assets_template_code_check";
--   ALTER TABLE "resume_assets" ADD CONSTRAINT "resume_assets_template_code_check"
--     CHECK ("template_code" IS NULL OR "template_code" IN ('klasican', 'moderan', 'minimalan'));
ALTER TABLE "resume_assets" DROP CONSTRAINT IF EXISTS "resume_assets_template_code_check";
ALTER TABLE "resume_assets" ADD CONSTRAINT "resume_assets_template_code_check"
  CHECK ("template_code" IS NULL OR "template_code" IN ('klasican', 'moderan', 'minimalan', 'evropski', 'prakticni'));
