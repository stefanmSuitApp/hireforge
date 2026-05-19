-- Step 7 — employer email verification gate (MVP: null until verified; dev token logged on signup).
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "email_verified_at" timestamptz;
