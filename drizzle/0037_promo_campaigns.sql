-- P — public campaigns next to private promo codes (0037).
-- `kind`: 'code' = typed private codes (influencers, ads, sales; never shown
-- on the site); 'campaign' = applied automatically and advertised in the
-- home banner, with a generated code used only for redemption records.
-- `is_active` pauses either kind without touching its dates.
--
-- Rollback:
--   ALTER TABLE "promo_codes" DROP CONSTRAINT IF EXISTS "promo_codes_kind_check";
--   ALTER TABLE "promo_codes" DROP COLUMN IF EXISTS "banner_en";
--   ALTER TABLE "promo_codes" DROP COLUMN IF EXISTS "banner_sr";
--   ALTER TABLE "promo_codes" DROP COLUMN IF EXISTS "is_active";
--   ALTER TABLE "promo_codes" DROP COLUMN IF EXISTS "kind";
ALTER TABLE "promo_codes" ADD COLUMN IF NOT EXISTS "kind" text DEFAULT 'code' NOT NULL;
ALTER TABLE "promo_codes" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "promo_codes" ADD COLUMN IF NOT EXISTS "banner_sr" text;
ALTER TABLE "promo_codes" ADD COLUMN IF NOT EXISTS "banner_en" text;
ALTER TABLE "promo_codes" DROP CONSTRAINT IF EXISTS "promo_codes_kind_check";
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_kind_check" CHECK ("kind" IN ('code', 'campaign'));
