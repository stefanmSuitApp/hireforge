-- Step 8D: optional public contact fields for staff (moderator) profiles shown to employers.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "public_display_name" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "public_phone" text;
