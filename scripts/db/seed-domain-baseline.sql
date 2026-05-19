-- Baseline dev data (run after migrations). Idempotent on email/slug.
-- Apply: pnpm db:seed:domain   (or: psql "$DATABASE_URL" -f scripts/db/seed-domain-baseline.sql)
-- Optional: `pnpm db:seed:rs` loads curated districts + cities from scripts/db/data/rs-municipalities.json (run before this if you need taxonomy).
--
-- Dev logins (bcrypt 12 rounds, same password for all — rotate in any shared env):
--   Password: HireforgeDev1!
--   admin@hireforge.local       (role: admin)
--   employer@hireforge.local    (role: employer) — DEVLEGION company
--   maticstefan1996@gmail.com    (role: employer) — second company (`stefan-matic-local`)
--   candidate@hireforge.local   (role: candidate)
--   moderator@hireforge.local   (role: moderator)
--
-- Password hash below must match apps/api `hashPassword` (bcryptjs, ROUNDS=12).
-- Regenerate: node -e "require('bcryptjs').hash('YourPassword',12).then(console.log)"

INSERT INTO users (id, email, role, password_hash) VALUES
  ('00000000-0000-4000-8000-000000000001', 'admin@hireforge.local', 'admin', '$2b$12$cwXFsRTpZKtPWDsV5zD1/uU6BZOydnFPM7K.hokXQYzPQ5A4O9uwe'),
  ('00000000-0000-4000-8000-000000000002', 'moderator@hireforge.local', 'moderator', '$2b$12$cwXFsRTpZKtPWDsV5zD1/uU6BZOydnFPM7K.hokXQYzPQ5A4O9uwe'),
  ('00000000-0000-4000-8000-000000000003', 'employer@hireforge.local', 'employer', '$2b$12$cwXFsRTpZKtPWDsV5zD1/uU6BZOydnFPM7K.hokXQYzPQ5A4O9uwe'),
  ('00000000-0000-4000-8000-000000000004', 'candidate@hireforge.local', 'candidate', '$2b$12$cwXFsRTpZKtPWDsV5zD1/uU6BZOydnFPM7K.hokXQYzPQ5A4O9uwe')
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  updated_at = now();

-- Dev fixture (codename, kept as-is per Step 3 plan). Source is honest:
-- the row was inserted by us, not via self-signup, so `admin_lead` is correct.
INSERT INTO companies (id, slug, legal_name, source, country_code, sales_status) VALUES
  ('10000000-0000-4000-8000-000000000001', 'devlegion', 'DEVLEGION d.o.o.',
   'admin_lead', 'RS', 'unassigned')
ON CONFLICT (slug) DO NOTHING;

-- Step 3 dropped the legacy `(user_id)` unique on `employers` and replaced it
-- with `(user_id, company_id)`; conflict target updates accordingly.
INSERT INTO employers (user_id, company_id)
SELECT u.id, c.id
FROM users u
CROSS JOIN companies c
WHERE u.email = 'employer@hireforge.local' AND c.slug = 'devlegion'
ON CONFLICT (user_id, company_id) DO NOTHING;

-- Second dev employer — same password as others; email pre-verified for package checkout / billing mail tests.
-- Company is assigned to seed moderator so `mark paid` works from moderator dashboard without extra DB steps.
INSERT INTO users (id, email, role, password_hash, email_verified_at) VALUES
  (
    '00000000-0000-4000-8000-000000000005',
    'maticstefan1996@gmail.com',
    'employer',
    '$2b$12$cwXFsRTpZKtPWDsV5zD1/uU6BZOydnFPM7K.hokXQYzPQ5A4O9uwe',
    now()
  )
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  email_verified_at = COALESCE(users.email_verified_at, EXCLUDED.email_verified_at),
  updated_at = now();

INSERT INTO companies (
  id,
  slug,
  legal_name,
  source,
  country_code,
  sales_status,
  assigned_moderator_id,
  billing_email
) VALUES (
  '10000000-0000-4000-8000-000000000002',
  'stefan-matic-local',
  'Stefan Matic (local dev)',
  'admin_lead',
  'RS',
  'unassigned',
  '00000000-0000-4000-8000-000000000002',
  'maticstefan1996@gmail.com'
)
ON CONFLICT (slug) DO UPDATE SET
  legal_name = EXCLUDED.legal_name,
  assigned_moderator_id = EXCLUDED.assigned_moderator_id,
  billing_email = EXCLUDED.billing_email,
  updated_at = now();

INSERT INTO employers (user_id, company_id)
SELECT u.id, c.id
FROM users u
CROSS JOIN companies c
WHERE u.email = 'maticstefan1996@gmail.com' AND c.slug = 'stefan-matic-local'
ON CONFLICT (user_id, company_id) DO NOTHING;

INSERT INTO candidates (user_id)
SELECT id FROM users WHERE email = 'candidate@hireforge.local'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO cities (slug, country_code, name_sr, name_en, postal_code) VALUES
  ('beograd', 'RS', 'Beograd', 'Belgrade', '11000'),
  ('novi-sad', 'RS', 'Novi Sad', 'Novi Sad', '21000')
ON CONFLICT (slug, country_code) DO NOTHING;

INSERT INTO job_categories (slug, name_sr, name_en) VALUES
  ('it', 'IT', 'IT'),
  ('marketing', 'Marketing', 'Marketing')
ON CONFLICT (slug) DO NOTHING;

-- Sample published job (list/browse UI); idempotent on primary key
INSERT INTO jobs (
  id,
  company_id,
  created_by_user_id,
  title,
  description,
  status,
  city_id,
  category_id,
  published_at
)
SELECT
  '20000000-0000-4000-8000-000000000001'::uuid,
  c.id,
  u.id,
  'Senior TypeScript developer',
  'Product engineering — Belgrade / hybrid. Stack: NestJS, PostgreSQL, Next.js.',
  'published'::job_status,
  ci.id,
  jc.id,
  now()
FROM companies c
JOIN users u ON u.email = 'employer@hireforge.local'
JOIN cities ci ON ci.slug = 'beograd' AND ci.country_code = 'RS'
JOIN job_categories jc ON jc.slug = 'it'
WHERE c.slug = 'devlegion'
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Step 4 — packages mirror, prices, entitlements (placeholder data)
--
-- Values match SSOT §6.2 (prices) and §6.3 (entitlements). Step 6 (Sanity
-- sync) overwrites these via webhook on first publish; for now they let
-- Step 7 (signup) and Step 9 (subscription flow) develop end-to-end against
-- a baseline. GAZDA has no price rows — Enterprise pricing is admin-set
-- per contract.
--
-- Re-run safe via `ON CONFLICT DO NOTHING`; existing dev rows are not
-- mutated (so any local CMS sync output sticks).
-- =============================================================================

INSERT INTO packages (code, is_active, is_enterprise, display_order) VALUES
  ('tezga',  true, false, 1),
  ('sljaka', true, false, 2),
  ('sef',    true, false, 3),
  ('gazda',  true, true,  4)
ON CONFLICT (code) DO NOTHING;

-- Prices in EUR minor units (e.g. 3000 = 30.00 EUR).
INSERT INTO package_prices (package_code, duration_days, amount_minor, currency) VALUES
  ('tezga',  15, 3000, 'EUR'),
  ('tezga',  30, 3700, 'EUR'),
  ('sljaka', 15, 4000, 'EUR'),
  ('sljaka', 30, 4700, 'EUR'),
  ('sef',    30, 5500, 'EUR')
ON CONFLICT (package_code, duration_days, currency) DO NOTHING;

-- Entitlements: one row per (package, key). Editor blob is nested JSON.
INSERT INTO package_entitlements (package_code, key, value) VALUES
  -- TEZGA
  ('tezga', 'max_active_jobs',     '1'::jsonb),
  ('tezga', 'max_cities',          '1'::jsonb),
  ('tezga', 'max_characters',      '400'::jsonb),
  ('tezga', 'featured_listing',    'false'::jsonb),
  ('tezga', 'png_creative',        'false'::jsonb),
  ('tezga', 'social_publish',      'false'::jsonb),
  ('tezga', 'paid_social_ads',     'false'::jsonb),
  ('tezga', 'crossborder_visible', 'false'::jsonb),
  ('tezga', 'hyperlinks_max_count','1'::jsonb),
  ('tezga', 'editor', '{"bold":false,"italic":false,"underline":false,"headings":false,"lists":false,"blockquote":false,"inline_code":false,"code_block":false,"text_align":false,"image_upload":false,"embed":false,"hyperlinks":true,"custom_html":false}'::jsonb),
  -- SLJAKA
  ('sljaka', 'max_active_jobs',     '1'::jsonb),
  ('sljaka', 'max_cities',          '3'::jsonb),
  ('sljaka', 'max_characters',      '4000'::jsonb),
  ('sljaka', 'featured_listing',    'false'::jsonb),
  ('sljaka', 'png_creative',        'false'::jsonb),
  ('sljaka', 'social_publish',      'true'::jsonb),
  ('sljaka', 'paid_social_ads',     'false'::jsonb),
  ('sljaka', 'crossborder_visible', 'false'::jsonb),
  ('sljaka', 'hyperlinks_max_count','3'::jsonb),
  ('sljaka', 'editor', '{"bold":true,"italic":true,"underline":true,"headings":true,"lists":true,"blockquote":false,"inline_code":false,"code_block":false,"text_align":false,"image_upload":false,"embed":false,"hyperlinks":true,"custom_html":false}'::jsonb),
  -- SEF
  ('sef', 'max_active_jobs',     '3'::jsonb),
  ('sef', 'max_cities',          '"unlimited"'::jsonb),
  ('sef', 'max_characters',      '8000'::jsonb),
  ('sef', 'featured_listing',    'true'::jsonb),
  ('sef', 'png_creative',        'true'::jsonb),
  ('sef', 'social_publish',      'true'::jsonb),
  ('sef', 'paid_social_ads',     'true'::jsonb),
  ('sef', 'crossborder_visible', 'true'::jsonb),
  ('sef', 'hyperlinks_max_count','5'::jsonb),
  ('sef', 'editor', '{"bold":true,"italic":true,"underline":true,"headings":true,"lists":true,"blockquote":true,"inline_code":true,"code_block":true,"text_align":true,"image_upload":true,"embed":false,"hyperlinks":true,"custom_html":false}'::jsonb),
  -- GAZDA (Enterprise; max_active_jobs starts at 10, admin-tunable per contract)
  ('gazda', 'max_active_jobs',     '10'::jsonb),
  ('gazda', 'max_cities',          '"unlimited"'::jsonb),
  ('gazda', 'max_characters',      '20000'::jsonb),
  ('gazda', 'featured_listing',    'true'::jsonb),
  ('gazda', 'png_creative',        'true'::jsonb),
  ('gazda', 'social_publish',      'true'::jsonb),
  ('gazda', 'paid_social_ads',     'true'::jsonb),
  ('gazda', 'crossborder_visible', 'true'::jsonb),
  ('gazda', 'hyperlinks_max_count','10'::jsonb),
  ('gazda', 'editor', '{"bold":true,"italic":true,"underline":true,"headings":true,"lists":true,"blockquote":true,"inline_code":true,"code_block":true,"text_align":true,"image_upload":true,"embed":true,"hyperlinks":true,"custom_html":false}'::jsonb)
ON CONFLICT (package_code, key) DO NOTHING;
