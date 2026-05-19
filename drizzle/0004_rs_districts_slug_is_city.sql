-- Replace GeoSrbija integer districts with slug-based districts + `is_city` flag on `cities`.
ALTER TABLE "cities" DROP CONSTRAINT IF EXISTS "cities_district_code_districts_code_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "cities_district_code_idx";
--> statement-breakpoint
ALTER TABLE "cities" DROP COLUMN IF EXISTS "district_code";
--> statement-breakpoint
DROP INDEX IF EXISTS "cities_opstina_maticni_broj_unique";
--> statement-breakpoint
ALTER TABLE "cities" DROP COLUMN IF EXISTS "opstina_maticni_broj";
--> statement-breakpoint
DROP TABLE IF EXISTS "districts" CASCADE;
--> statement-breakpoint
CREATE TABLE "districts" (
	"slug" text PRIMARY KEY NOT NULL,
	"name_sr" text NOT NULL,
	"name_en" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cities" ADD COLUMN IF NOT EXISTS "district_slug" text;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "cities"
		ADD CONSTRAINT "cities_district_slug_districts_slug_fk"
		FOREIGN KEY ("district_slug") REFERENCES "districts"("slug") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "cities" ADD COLUMN IF NOT EXISTS "is_city" boolean NOT NULL DEFAULT true;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cities_district_slug_idx" ON "cities" ("district_slug");
