-- Step 14 — promo checkout snapshot on subscription row (analytics + simpler reads).
ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "applied_promo_code" text;
