-- Step 13: candidate profile + CV builder JSON (PRODUCT_SSOT §9.1 / §9.2).

ALTER TABLE candidates ADD COLUMN phone text;
ALTER TABLE candidates ADD COLUMN headline text;
ALTER TABLE candidates ADD COLUMN city_id uuid;
ALTER TABLE candidates ADD COLUMN cv_profile jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE candidates
  ADD CONSTRAINT candidates_city_id_fkey
  FOREIGN KEY (city_id) REFERENCES cities (id) ON DELETE SET NULL;

CREATE INDEX candidates_city_id_idx ON candidates (city_id);
