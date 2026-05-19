ALTER TABLE "cities" ADD COLUMN IF NOT EXISTS "postal_code" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cities_postal_code_idx" ON "cities" ("postal_code");
