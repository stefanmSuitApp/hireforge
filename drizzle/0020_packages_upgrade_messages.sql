-- Package catalogue: CMS-mirrored upgrade copy for checkout cards (Step 9.5).
-- Rollback: ALTER TABLE packages DROP COLUMN IF EXISTS upgrade_messages;

ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS upgrade_messages jsonb;
