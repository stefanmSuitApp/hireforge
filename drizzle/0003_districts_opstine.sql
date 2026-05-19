-- Administrative districts (okrug) + municipality (opština) links for GeoSrbija seed.
CREATE TABLE IF NOT EXISTS "districts" (
	"code" integer PRIMARY KEY NOT NULL,
	"name_sr" text NOT NULL,
	"name_en" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cities" ADD COLUMN IF NOT EXISTS "district_code" integer;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "cities"
		ADD CONSTRAINT "cities_district_code_districts_code_fk"
		FOREIGN KEY ("district_code") REFERENCES "districts"("code") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "cities" ADD COLUMN IF NOT EXISTS "opstina_maticni_broj" integer;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cities_opstina_maticni_broj_unique" ON "cities" ("opstina_maticni_broj");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cities_district_code_idx" ON "cities" ("district_code");
