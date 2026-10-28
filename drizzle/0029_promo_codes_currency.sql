-- Phase B — fixed-amount promo values are minor units of a currency; without
-- one, a code meant as 5,000.00 RSD off made a 37.00 EUR package free.
-- Checkout now rejects fixed codes whose currency is missing or differs.
--
-- Rollback:
--   ALTER TABLE "promo_codes" DROP COLUMN IF EXISTS "currency";
ALTER TABLE "promo_codes" ADD COLUMN IF NOT EXISTS "currency" text;
