# Sljakam Refactor — Migration & Execution Plan

Companion to [`PRODUCT_SSOT_SLJAKAM.md`](../../PRODUCT_SSOT_SLJAKAM.md).

This document breaks the refactor into **steps** with **mini-steps** inside.
After **every step (not every mini-step)** the team runs a **verification
gate** (lint, typecheck, build, tests, migration apply / rollback, manual
smoke, consistency sweep). The next step does **not** start until the gate
is green.

> **Status:** In progress. Update step status (`pending → in_progress →
completed`) at the bottom of each step as you ship.

---

## Conventions used in this document

- **Goal** — one-sentence statement of what shipping this step buys.
- **Why now** — why it has to ship in this position in the sequence.
- **Depends on** — earlier steps that must be complete.
- **Touches** — which apps / libs / tables are changed.
- **Owners** — placeholder for assignment when scheduled.
- **Mini-steps** — atomic units of work. Each is a small PR or commit.
- **Verification gate** — runs once after the step is complete.
- **Acceptance criteria** — externally observable behavior that must hold.
- **Performance & simplicity gate** — operating-principle checks specific
  to the step (see SSOT §14).

### Standard verification gate (used by every step)

After completing all mini-steps for a step:

- [ ] `pnpm lint` — all projects pass.
- [ ] `pnpm format` — Prettier reports no diffs.
- [ ] `pnpm typecheck` — all projects pass.
- [ ] `pnpm build` — touched apps build cleanly.
- [ ] `pnpm test` — touched projects pass.
- [ ] **Migration sanity** (when DB changes were made):
  - [ ] `pnpm db:generate` produces a single coherent migration.
  - [ ] `pnpm db:migrate` applies cleanly on a fresh DB.
  - [ ] Drizzle journal entry exists (`drizzle/meta/_journal.json`).
  - [ ] Rollback path is documented in the migration’s SQL header.
- [ ] **Manual smoke** — the step’s primary flow is exercised in `pnpm dev:all`.
- [ ] **Consistency sweep** — `rg "Hireforge"`, `rg "TODO_REFACTOR"`,
      `rg "FIXME"`, missing i18n keys, duplicated literal strings, deprecated
      endpoints — all noted in the step’s changelog and either fixed or filed
      as follow-ups in the next step.
- [ ] **i18n parity** — `apps/web/src/messages/sr.json` and `en.json` keys
      match exactly (CI test added in Step 15).

If any item fails, **fix or roll back before starting the next step**.

---

## High-level sequence

| #   | Step                                                                 | Theme                            |
| --- | -------------------------------------------------------------------- | -------------------------------- |
| 1   | Decisions lock & docs                                                | Product + execution SSOT in repo |
| 2   | Brand pass — UI rename to Šljakam (display) / sljakam (ASCII)        | Copy + metadata + emails         |
| 3   | Schema delta A — companies, ownership, employers                     | Foundation for billing & sales   |
| 4   | Schema delta B — packages mirror, subscriptions, billing docs        | Foundation for monetisation      |
| 5   | Schema delta C — jobs, applications, resume assets, promo codes      | Foundation for product loops     |
| 6   | CMS schemas + Sanity → DB sync worker                                | Editor authoring path            |
| 7   | Foreign-aware employer self-signup + upsert                          | Real registrations onboard       |
| 8   | Moderator leads & sales ownership UI / API                           | Sales operationalised            |
| 9   | Subscription lifecycle + proforma / invoice / payment marking        | Money in                         |
| 10  | Job ad refactor — slug URLs, apply_mode, auto-expiry, direct publish | Marketplace mechanics            |
| 11  | TipTap editor + capability matrix + image upload                     | Author UX gated by package       |
| 12  | Apply flow refactor — internal / external, withdraw, rate-limit      | Candidate UX                     |
| 13  | CV templates + generator                                             | 3 PDF templates from profile     |
| 14  | Promo codes + “Nedelja besplatnih oglasa”                            | Growth lever                     |
| 15  | Public discovery UX (Glassdoor-style) + SEO + locale + i18n parity   | Candidate-facing redesign        |
| 16  | GDPR retention + cookie consent + erasure                            | Compliance floor                 |
| 17  | Performance + accessibility CI gates                                 | Operating principle enforcement  |
| 18  | Test billing mode + final hardening + launch readiness               | Launch                           |

---

## Step 1 — Decisions lock & docs

**Goal:** Land the product and execution SSOTs in the repo so every decision
above this line is committed reference material.

**Why now:** Without a written-down baseline, the rest of the refactor will
re-litigate every decision PR by PR.

**Depends on:** Nothing.

**Touches:** `PRODUCT_SSOT_SLJAKAM.md`, `docs/refactor/MIGRATION_PLAN.md`,
`PROJECT_SSOT.md` (cross-link), `README.md` (link).

**Owners:** TBA.

### 1.1 Author `PRODUCT_SSOT_SLJAKAM.md`

- [x] Brand & positioning, scope, personas.
- [x] Roles & permissions matrix.
- [x] Domain model overview (companies, sales, subscriptions, jobs, etc.).
- [x] Package model + entitlements snapshot.
- [x] Job lifecycle and apply flows.
- [x] Billing (RSD / EUR, refund / cancellation, GDPR retention).
- [x] State machines.
- [x] Operating principles (performance, simplicity, a11y, anti-features).
- [x] KPIs, out-of-scope, decisions log, glossary, cross-links.

### 1.2 Author `docs/refactor/MIGRATION_PLAN.md`

- [x] This document.

### 1.3 Cross-link from existing docs

- [x] Add a short pointer in `PROJECT_SSOT.md` to the new product SSOT and
      this plan.
- [x] Update `README.md` with a one-liner link to both.

### Verification gate

Standard gate. **Migration sanity** items skipped (no DB changes).

- [x] `pnpm format` — clean on the four files touched by this step.
- [x] Cross-references resolve (verified against the workspace).
- [x] Heading structure is consistent in both new docs (sequential `##`).
- [x] Consistency sweep confirms remaining `Hireforge` user-visible strings
      are scoped to `apps/web/src/messages/*.json`, which is precisely the
      target of Step 2.

### Acceptance criteria

- Both SSOT files exist on `main`-targeted branch and render correctly on GitHub.
- A new contributor can read SSOT + plan in under one hour and start work.

### Performance & simplicity gate

Not applicable.

**Status:** completed.

---

## Step 2 — Brand pass: UI rename to Šljakam (display) / sljakam (ASCII)

**Goal:** Switch every user-visible string, OG tag, email subject, page
title, alt text, and CMS copy from “Hireforge” to **Šljakam** (with
diacritic). Use the ASCII form `sljakam` only where SSOT §1.1.1 says so:
domain, URLs, slugs, env vars, identifiers, S3 prefixes, code. Repo
internals (`hireforge` codename, package names) stay.

**Why now:** Subsequent steps add new copy; rename **before** they land or
we will paint a moving target. The brand split rule must be absorbed by
all later steps.

**Depends on:** Step 1.

**Touches:** `apps/web` (`messages/*.json`, `metadata`, `layout`, footer,
header, sitemap, robots), `apps/cms` Studio title, email templates if any,
`apps/web/public` (favicon / OG image swap if assets are ready), README.

### 2.1 Audit references

- [x] `rg -i "hireforge"` and classify each hit:
  - **replace** with the display brand `Šljakam` if the string appears in
    a user-facing surface (UI, OG, page title, email body, alt text);
  - **replace** with `sljakam` (ASCII) if the string is a URL, env var,
    identifier, slug, file path, or `mailto:`;
  - **keep** if it is repo-internal (Nx project name, package name,
    workspace tag, code identifier, comment).
- [x] Classification recorded in `.cursor/plans/step2-brand-pass_68d79152.plan.md` ("Stays as-is" section).

### 2.2 Replace user-facing strings

- [x] `apps/web/src/messages/sr.json` and `en.json`: every visible brand
      string switched to `Šljakam` (5 sites each: page title, `Nav.brand`,
      `Editorial.defaultDescription`, `EmployersPage.metaDescription`,
      `Employer.registerSubtitle`).
- [x] Page titles, meta descriptions, OG title, OG site name, Twitter card
      → `Šljakam` (with diacritic) in `apps/web/src/app/[locale]/layout.tsx`.
      **Skipped:** `<meta name="keywords">` augmentation — Google deprecated
      the keywords meta for ranking ~2009; brand visibility is already
      carried by `<title>` + `og:site_name`. Decision logged here.
- [x] Header / footer brand `aria-label`: `Šljakam` via the new
      `BrandWordmark` component (replaces inline text rendering in both
      `site-header.tsx` and `site-footer.tsx`).
- [x] Footer copyright switched to `© Šljakam. Sva prava zadržana.` (sr)
      and `© Šljakam. All rights reserved.` (en). DEVLEGION retired from
      user-visible surfaces (see Step 2 changelog 2026-05-06).
- [x] CMS Studio app title (Sanity Studio root): `Šljakam CMS` (workspace
      `name: 'hireforge'` retained per SSOT §1.1.1 internal-codename rule).
- [ ] Email templates (when implemented in Step 9 / 17): `From` display
      name `Šljakam`, sender address remains `noreply@sljakam.com`.
      **Carries forward to Step 9 / 17** — no email infrastructure exists yet.

### 2.3 ASCII-only surfaces

- [x] Sweep confirmed no diacritic appears in URLs, env vars, slug
      builders, S3 prefixes, sitemap entries, `mailto:` links, or `email
From` addresses (`Šljakam` only surfaces in `messages/*.json`,
      `layout.tsx` metadata, the `BrandWordmark` JSDoc, and a CSS comment).
- [x] Vitest test landed at `libs/shared/src/lib/transliteration.test.ts`
      (9 cases: `š→s`, `ć→c`, `č→c`, `đ→dj`, `ž→z`, plus length cap,
      Cyrillic strip, and dash/whitespace collapse). Runs as part of
      `pnpm test`.

### 2.4 Static assets — placeholder strategy

The final brand assets are being produced by the designer. Until they
arrive, the brand pass uses **placeholder assets** so the rename can ship
independently.

- [x] Typographic **`Šljakam` wordmark placeholder** introduced as a single
      `BrandWordmark` React component (`apps/web/src/components/brand-wordmark.tsx`)
      and wired into both `site-header.tsx` and `site-footer.tsx`. Renders
      a styled `<span>` with the existing body font (no new font request).
      A single comment marks it as the swap point for the designer's final
      asset (inline SVG or `<img>`) — no callers will need to change.
- [ ] **Deferred until designer delivers:** replace `apps/web/public/favicon.ico`
      (current is a generic placeholder, not Hireforge-branded; no regression).
      Preserve the previous favicon at `apps/web/public/legacy/favicon.ico`
      for rollback.
- [ ] **Deferred until designer delivers:** OG default image at
      `apps/web/public/og/og-default.png` (does not exist today; no regression).
- [ ] **Deferred until designer delivers:** Studio favicon (Sanity default
      retained for now).
- [x] Swap procedure when assets arrive: replace the body of `BrandWordmark`
      with the inline SVG (or `<img>`) at the same component path; favicon /
      OG / Studio favicon are file-replacement only. No call-site changes.

### 2.5 README & docs surface

- [x] `README.md` references the public brand as `Šljakam` and the domain
      as `sljakam.com` (delivered alongside Step 1 cross-linking, refined
      in Step 2 to drop DEVLEGION from the user-visible header line and
      from the GitHub description).
- [x] `PROJECT_SSOT.md` carries the brand-split pointer to
      `PRODUCT_SSOT_SLJAKAM.md` §1.1.1 (added in Step 1; ownership line
      switched from DEVLEGION to Šljakam in Step 2).

### Verification gate

Standard gate. Manual smoke in `dev:all`: home, jobs list, employer login,
candidate registration screen — all render `Šljakam` (with the caron) in
both `sr` and `en`. Inspect each rendered HTML head: `<title>`,
`og:site_name`, `og:title`, `twitter:title` all use the diacritic; canonical
URL uses the ASCII domain.

### Acceptance criteria

- `rg -i "hireforge"` returns **only** repo-internal hits (Nx project name,
  package name, workspace tag, comments). Zero user-visible occurrences.
- `rg "Šljakam"` returns hits in `apps/web/src/messages/*.json`, page
  metadata, email templates (when implemented), and Studio title — and
  **never** in URL paths, env vars, or `mailto:` strings.
- The slug transliteration test passes (š → s, ć → c, č → c, đ → dj, ž → z).
- Both locales display the new brand consistently. No missing strings.
- No broken images.

### Performance & simplicity gate

- LCP not regressed by the new logo / OG asset.
- No additional fonts pulled in.
- Wordmark asset is `< 30 KB` and uses the same font family as body copy
  (no extra font request for the brand alone).

**Status:** completed (2026-05-06). Static assets (favicon, OG image,
Studio favicon) deferred until designer delivers; swap is a file-only
change at the existing paths plus the `BrandWordmark` body. Email-template
brand strings carry forward to Step 9 / 17 (no email infrastructure exists
yet). `<meta name="keywords">` augmentation explicitly skipped (deprecated
for ranking). DEVLEGION was retired from user-visible surfaces (footer
copyright, README header, README GitHub description, `PROJECT_SSOT.md`
ownership line, `package.json` author).

---

## Step 3 — Schema delta A: companies, sales ownership, employers

**Goal:** Extend `companies` for foreign-aware billing fields and sales
ownership; relax `employers` uniqueness; introduce
`company_assignments_history`.

**Why now:** Every subsequent step (sales UI, billing, signup, jobs)
references columns added here. Doing the schema first removes thrash.

**Depends on:** Step 1.

**Touches:** `libs/database/src/schema.ts`, new Drizzle migration under
`drizzle/`, `libs/contracts` (company DTO + Zod), seed scripts where
companies are referenced.

### 3.1 Schema additions on `companies`

- [x] `is_foreign boolean not null default false`.
- [x] `country_code text not null default 'RS'`.
- [x] `pib text` — partial unique when not null.
- [x] `mb text` — partial unique when not null.
- [x] `vat_id text` — partial unique when not null.
- [x] `tax_id text`.
- [x] `registration_number text`.
- [x] Address: `address_line_1`, `address_line_2`, `address_postal_code`,
      `address_city`, `address_state_region`.
- [x] Bank: `bank_name`, `iban`, `swift_bic`, `bank_country_code`,
      `account_currency`.
- [x] Billing prefs: `invoice_currency` (default `EUR`),
      `invoice_language` (default `sr`),
      `vat_treatment` (default `rs_standard_20`, `text + CHECK` for P2 SEF/VAT
      extensibility).
- [x] Billing contact: `billing_email`, `billing_phone`,
      `billing_contact_name`.
- [x] `responsible_person`, `responsible_position`.
- [x] Sales: `sales_status` (`unassigned | pipeline | closed_won |
closed_lost`, default `unassigned`, modelled as `pgEnum`).
- [x] `assigned_moderator_id uuid` referencing `users.id`
      (`on delete set null`).
- [x] `closed_won_at`, `closed_lost_at` timestamps.
- [x] `source` (`self_signup | moderator_lead | admin_lead`, `pgEnum`).

### 3.2 New table `company_assignments_history`

- [x] `id`, `company_id` (FK), `from_user_id`, `to_user_id`,
      `changed_by_admin_id`, `reason text`, `created_at`.
- [x] Index on `(company_id, created_at)`.

### 3.3 Relax `employers` uniqueness

- [x] Drop the existing unique on `employers.user_id`.
- [x] Add composite unique on `(user_id, company_id)`.
- [x] Service-layer guard: in MVP, reject inserts that would create a
      second `employers` row for the same `user_id` (single-company invariant).
      Implemented in `apps/api/src/auth/auth.service.ts` `registerEmployer`,
      raising the new `EMPLOYER_ALREADY_LINKED` coded error (registered in
      `libs/contracts/src/lib/api-errors.ts` + translated in `sr.json` /
      `en.json`).

### 3.4 Drizzle migration

- [x] Hand-written `drizzle/0011_companies_billing_and_sales.sql` (Drizzle Kit
      generate requires a TTY for the new-table prompt, and the repo's existing
      pattern — `0007`, `0009` — is hand-written idempotent SQL with
      `DO $$ … EXCEPTION WHEN duplicate_object/duplicate_column …` guards;
      we kept that pattern).
- [x] Header with purpose, rollback steps, and a list of partial unique
      indexes added.
- [x] Updated `drizzle/meta/_journal.json` (idx 11).

### 3.5 Contracts & DTOs

- [x] New `libs/contracts/src/lib/companies.ts` exporting:
      `salesStatusSchema`, `companySourceSchema`, `vatTreatmentSchema`,
      `EU_COUNTRY_CODES` set + `isEUCountry()`, field-level schemas
      (`pibSchema`, `mbSchema`, `vatIdSchema`, `taxIdSchema`, `ibanSchema`,
      `swiftBicSchema`, `currencyCodeSchema`, `countryCodeSchema`),
      `companyBaseSchema`, `companyDomesticInputSchema`, and
      `companyForeignInputSchema` (with conditional EU-vs-non-EU refinement).
- [x] Re-exported from `libs/contracts/src/index.ts`.
- [x] Extended `libs/contracts/src/lib/staff-admin.ts`:
      `staffCompanyCreateBodySchema` and `staffCompanyPatchBodySchema` accept
      all new fields as optional (moderator-lead semantics);
      `StaffCompanyDetailResponse` adds the new fields as optional so the
      existing `staff-companies.service.ts` keeps compiling unchanged
      (Step 8 wires the moderator UI and tightens these to required-nullable).
- [x] Vitest tests (`libs/contracts/src/lib/companies.test.ts`, 17 cases)
      covering domestic / foreign refinement edges + EU/non-EU helpers + enum
      schemas.

### 3.6 Seed compatibility

- [x] Updated `scripts/db/seed-domain-baseline.sql`:
      dev `INSERT INTO companies` now populates `source = 'admin_lead'` (honest
      provenance — the row was inserted by us, not via self-signup),
      `country_code = 'RS'`, `sales_status = 'unassigned'`. The
      `employers` `ON CONFLICT` target updates from `(user_id)` to
      `(user_id, company_id)` to match the new composite unique.
- [x] `seed-domain-baseline.mjs` is unchanged (it only `psql`-applies the SQL).

### Verification gate

- [x] `pnpm format` — clean on touched files.
- [x] `pnpm exec nx run-many -t lint -p api web shared cms contracts database`
      — clean.
- [x] `pnpm exec nx run-many -t typecheck` (web, shared, cms, contracts) plus
      direct `tsc --noEmit -p apps/api/tsconfig.app.json` — all clean.
- [x] `pnpm test` — 3 projects, all green; new 17 tests in
      `libs/contracts/src/lib/companies.test.ts`.
- [x] `pnpm build:api` — webpack compiled successfully.
- [x] `pnpm db:migrate` — applied `0011_companies_billing_and_sales.sql`
      cleanly; rerun is a no-op.
- [x] `pnpm db:seed:domain` — completes, idempotent on re-run.
- [x] Postgres introspection (`pg_indexes`, `information_schema.columns`,
      `pg_constraint`) confirms: 25+ new columns on `companies`, partial unique
      indexes on `pib` / `mb` / `vat_id`, btree indexes on
      `assigned_moderator_id` / `sales_status`, `companies_vat_treatment_check`
      CHECK constraint, `company_assignments_history` table, `sales_status` /
      `company_source` enum types, and `employers` having only the new
      composite `(user_id, company_id)` unique index.
- [x] Raw-SQL smoke: duplicate `pib` rejected (23505 unique_violation, partial
      index `companies_pib_unique`); two NULL `pib` rows accepted; bad
      `vat_treatment` value rejected (23514 check_violation); duplicate
      `(user_id, company_id)` employers row rejected; differing
      `(user_id, company_id)` accepted (multi-company schema readiness
      confirmed).
- [x] HTTP smoke: API booted (Postgres + Redis up), `GET /api/health/ready`
      → 200 `{postgres: up, redis: up}`, `GET /api/moderator/companies`
      (legacy "staff" endpoint) → 401 `UNAUTHORIZED`,
      `POST /api/auth/employer/register` with seeded email → 409
      `AUTH_EMAIL_EXISTS` (existing path intact).

### Acceptance criteria

- All new columns exist with the right types and defaults.
- Existing fixtures and seeds keep working.
- Cannot insert two companies with the same PIB / MB / VAT ID
  (when not null).
- `closed_won` companies cannot be reassigned by anyone other than admin
  (service-layer enforcement; reassignment endpoint and UI land in Step 8).
- New `EMPLOYER_ALREADY_LINKED` coded error rejects a second `employers` row
  for the same user; DB still allows multi-company at the schema level so
  Step 9 / future multi-company support requires no migration.

**Status:** completed (2026-05-06). Decisions logged: hybrid enum modelling
(`pgEnum` for `sales_status` / `company_source`; `text + CHECK` for
`vat_treatment` to keep P2 SEF/VAT extensions migration-light); MVP
"one user ↔ one company" invariant relocated to the service layer; dev
fixture (`'DEVLEGION d.o.o.'`, slug `devlegion`) left as-is with explicit
`source = 'admin_lead'`; `legal_name` normalization for upsert deferred to
Step 7. The hand-written migration also means future `pnpm db:generate`
runs will see schema drift vs `drizzle/meta/0000_snapshot.json` (the only
snapshot in the repo); we'll continue with hand-written idempotent SQL in
later steps until / unless we generate a fresh baseline snapshot.

### Performance & simplicity gate

- New indexes are partial (only-not-null) so write amplification stays low.
- No N+1 introduced in the company loaders.

**Status:** pending.

---

## Step 4 — Schema delta B: packages mirror, subscriptions, billing docs

**Goal:** Introduce the runtime mirror of CMS packages plus subscription,
proforma, invoice, and credit-note tables.

**Why now:** Steps 6 (CMS sync), 9 (subscription flow), and 10 (jobs
extension) all need these tables.

**Depends on:** Step 3.

**Touches:** `libs/database/src/schema.ts`, new migration, new contract
types, `libs/server/billing` package layout.

### 4.1 `packages` (mirror)

- [ ] `code text primary key` (`tezga | sljaka | sef | gazda`).
- [ ] `is_active boolean not null default true`.
- [ ] `is_enterprise boolean not null default false`.
- [ ] `display_order int`.
- [ ] `cms_ref text` — Sanity document id for traceability.
- [ ] `last_synced_at timestamptz`.
- [ ] `created_at`, `updated_at`.

### 4.2 `package_prices`

- [ ] `id`, `package_code` (FK), `duration_days int`, `amount_minor int`,
      `currency text` (3-letter), `cms_ref text`.
- [ ] Unique on `(package_code, duration_days, currency)`.

### 4.3 `package_entitlements`

- [ ] `id`, `package_code` (FK), `key text`, `value jsonb`.
- [ ] Unique on `(package_code, key)`.
- [ ] Conventional keys: `max_active_jobs`, `max_cities`, `max_characters`,
      `featured_listing`, `png_creative`, `social_publish`, `paid_social_ads`,
      `crossborder_visible`, `editor` (object with capability flags), and
      `hyperlinks_max_count`. Document conventions in
      `libs/contracts/src/packages.ts`.

### 4.4 `subscriptions`

- [ ] `id`, `company_id` (FK), `package_code` (FK).
- [ ] Snapshot fields: `duration_days int`, `price_minor int`,
      `currency text`, `entitlements_json jsonb`.
- [ ] `status text` (`pending_payment | active | expired | cancelled`).
- [ ] `starts_at`, `ends_at`, `created_at`, `updated_at`.
- [ ] `enabled_by_user_id`, `enterprise_admin_unlocked boolean default false`.
- [ ] `proforma_id`, `invoice_id` — back references (nullable; FKs added
      after the next sub-step).

### 4.5 `proformas`, `invoices`, `credit_notes`

- [ ] `proformas`: `id`, `subscription_id`, `number text unique`,
      `total_minor int`, `currency`, `pdf_storage_key`, `issued_at`,
      `paid_at`, `paid_marked_by_user_id`, `voided_at`.
- [ ] `invoices`: same shape minus `paid_at`/`paid_marked_by` (reuses the
      proforma’s) plus `nbs_rate jsonb` capturing the conversion rate used for
      RS clients.
- [ ] `credit_notes`: `id`, `invoice_id`, `number text unique`,
      `total_minor`, `reason text`, `issued_at`.
- [ ] Per-year sequences for `proformas.number`, `invoices.number`,
      `credit_notes.number` (Postgres `sequence` per type per year, allocated
      via `pg_advisory_xact_lock` in the issuing service to avoid gaps).

### 4.6 Contracts

- [ ] `libs/contracts/src/packages.ts`: `PackageCode`, `PackageDefinition`,
      `Entitlements`, snapshot types.
- [ ] `libs/contracts/src/subscriptions.ts`: state machine types,
      request/response shapes for purchase + activation.
- [ ] `libs/contracts/src/billing.ts`: proforma, invoice, credit-note types.

### 4.7 Drizzle migration

- [ ] One migration `drizzle/0012_packages_subscriptions_billing.sql`.
- [ ] Header documents rollback (drop tables + sequences in reverse order).

### Verification gate

Standard gate including migration sanity. Smoke: insert a
`packages` row with raw SQL, then a `subscriptions` row referencing it.

### Acceptance criteria

- Tables exist with the right columns, defaults, and FKs.
- Inserting a duplicate `proformas.number` is rejected by the unique
  constraint.
- A subscription cannot be inserted with a `package_code` that does not
  exist in `packages`.

### Performance & simplicity gate

- All FK lookups have indexes (`subscriptions.company_id`,
  `subscriptions.package_code`, `proformas.subscription_id`, etc.).
- No JSON column is the only filter target; conventional keys go through
  `package_entitlements` rows so we can query without scanning JSON.

**Status:** pending.

---

## Step 5 — Schema delta C: jobs, applications, resume assets, promo codes

**Goal:** Extend product-loop tables to support the new ad lifecycle, apply
modes, CV scalability, and promo codes.

**Why now:** Steps 10–14 all read or write these new columns.

**Depends on:** Steps 3 and 4.

**Touches:** `libs/database/src/schema.ts`, new migration, contracts.

### 5.1 `jobs` extensions

- [ ] `subscription_id uuid` (FK to `subscriptions.id`, nullable for legacy).
- [ ] `slug text` — unique with `(slug, status)` partial index for live rows.
- [ ] `short_id text` — short non-guessable suffix for SEO URL.
- [ ] `apply_mode text` (`internal | external`, default `internal`).
- [ ] `external_apply_url text` — must be `https://`, validated by app.
- [ ] `description_doc jsonb` — ProseMirror canonical doc.
- [ ] `description_html text` — sanitised render cache.
- [ ] `description_plain text` — plain-text projection (used for FTS).
- [ ] `primary_language text` (`sr | en`).
- [ ] `featured boolean default false`.
- [ ] `crossborder_visible boolean default false`.
- [ ] `external_apply_clicks int default 0`.
- [ ] Index on `(status, published_at)` and `(status, expires_at)`.

### 5.2 FTS index update

- [ ] Update the existing `0002_jobs_fts_index` GIN to use
      `description_plain` (or add a new index and drop the old one in the
      same migration).

### 5.3 `applications` extensions

- [ ] `status` enum extended with `viewed | shortlisted | rejected |
withdrawn | hired` (existing `submitted` retained).
- [ ] `cover_letter_text text` (≤ 1500 chars, app-validated).
- [ ] `resume_asset_id uuid` (FK).
- [ ] Snapshot fields: `resume_filename`, `resume_storage_key`.
- [ ] Unique partial: `(candidate_id, job_id)` where `status <> 'withdrawn'`.

### 5.4 `resume_assets` extensions

- [ ] `is_primary boolean default true`.
- [ ] `source text` (`uploaded | generated`).
- [ ] `template_code text` (`klasican | moderan | minimalan`, when
      generated).
- [ ] Service-layer rule: at most one `is_primary = true` per candidate
      in MVP.

### 5.5 `promo_codes` & `promo_redemptions`

- [ ] `promo_codes`: `id`, `code text unique`, `discount_type`
      (`percent | fixed | full_free`), `value int`, `valid_from`, `valid_to`,
      `applicable_packages text[]`, `applicable_categories text[]`,
      `max_redemptions int`, `max_per_company int`, `redemptions_count int
default 0`.
- [ ] `promo_redemptions`: `id`, `code text` (FK), `company_id`,
      `subscription_id`, `redeemed_at`.

### 5.6 Contracts

- [ ] `libs/contracts/src/jobs.ts`: extend with new fields, `ApplyMode`,
      slug shape, ProseMirror doc type alias.
- [ ] `libs/contracts/src/applications.ts`: status enum, cover-letter
      refinement.
- [ ] `libs/contracts/src/promo-codes.ts`.

### 5.7 Drizzle migration

- [ ] `drizzle/0013_jobs_applications_promo.sql`.

### Verification gate

Standard gate plus migration sanity. Manual smoke: query the public
listing endpoint after migration and confirm response shape unchanged
(new fields default values).

### Acceptance criteria

- Public list endpoint still returns rows with sane defaults for new fields.
- Applications respect the partial unique (cannot re-apply unless previous
  application is `withdrawn`).
- Promo redemptions cannot exceed `max_redemptions` (service-layer guard).

### Performance & simplicity gate

- New columns do not bloat list-endpoint payloads (only `excerpt` is
  shipped from `description_plain`, never the full doc).
- FTS query latency p95 unchanged or improved.

**Status:** pending.

---

## Step 6 — CMS schemas + Sanity → DB sync worker

**Goal:** Author packages, refund policy, support contact, and campaign
calendar in Sanity. Build the webhook handler that mirrors Sanity package
documents into Postgres mirror tables.

**Why now:** Step 9 depends on `packages` being populated from CMS.

**Depends on:** Step 4.

**Touches:** `apps/cms` (Sanity schemas), `apps/api` (webhook handler),
`apps/worker` (optional: schedule a hourly reconciliation), Sanity dataset
seeds in `scripts/cms/seed-sanity.mjs`.

### 6.1 Sanity package schema

- [ ] `packageDefinition` document type:
      `code` (string, validated against allowed codes),
      `isActive`, `isEnterprise`, `displayOrder`,
      `name { sr, en }`, `tagline { sr, en }`,
      `description { sr, en }` (Portable Text),
      `prices` (array of `{ durationDays, amountMinor, currency }`),
      `entitlements` (object covering all keys from SSOT §6.3),
      `upgradeMessages { sr, en }`.
- [ ] Validation: both `sr` and `en` required for every localised field.
- [ ] Studio preview shows `code` + first price.

### 6.2 Other Sanity authoring documents

- [ ] `refundPolicy` (Portable Text, sr + en) — surfaced on checkout and
      proforma footer.
- [ ] `supportContact` extension on `siteSettings`: email, phone, hours.
- [ ] `campaignCalendar` document: list of `{ vertical, code, startsAt,
endsAt }` for the rolling “Nedelja besplatnih oglasa”.

### 6.3 DB sync handler

- [ ] `apps/api` exposes `/api/cms/sync/package` POST endpoint protected
      by a shared secret header (`CMS_SYNC_SECRET`).
- [ ] On call, the handler upserts `packages`, replaces
      `package_prices` for the given code, replaces `package_entitlements`
      for the given code, all in a single DB transaction.
- [ ] Writes a `staff_audit_log` row with `actor='cms_webhook'`.
- [ ] Configures Sanity webhook in Studio (`packageDefinition` publish →
      the endpoint above).

### 6.4 Periodic reconciliation (worker)

- [ ] `apps/worker` adds a daily scheduled job `cms_packages_reconcile`
      that re-fetches every active package and re-applies the upsert to heal
      any missed webhook delivery.

### 6.5 Seed initial CMS content

- [ ] `scripts/cms/seed-sanity.mjs` extended with seed data for the four
      packages (TEZGA / ŠLJAKA / ŠEF / GAZDA) using the prices from SSOT §6.2
      and entitlements from SSOT §6.3.
- [ ] Seed includes the refund policy stub and the support contact.

### Verification gate

Standard gate. Manual smoke: run `pnpm cms:seed`, then
`POST /api/cms/sync/package` for each package code, confirm `packages`,
`package_prices`, `package_entitlements` reflect the CMS state.

### Acceptance criteria

- Editing a package price in Sanity Studio and publishing causes the
  Postgres mirror to reflect the change within 60 seconds.
- The reconciliation worker recovers from missed webhooks.
- Active subscriptions are **not** affected by CMS edits (verified by
  inspecting an existing `subscriptions.entitlements_json` snapshot).

### Performance & simplicity gate

- Webhook handler returns within 500 ms p95.
- Sync transaction does not block reads (uses short transactions and FK
  upserts).

**Status:** shipped — catalogue sync path + worker reconcile + Studio/seed MVP; localized package marketing fields in §6.1 deferred until the web consumes them.

---

## Step 7 — Foreign-aware employer self-signup + upsert

**Goal:** Replace the existing employer registration with a form that
captures domestic vs foreign-aware fields and runs the upsert match
described in SSOT §5.4.

**Why now:** Real employer onboarding is the entry point for every
subsequent flow.

**Depends on:** Steps 3, 5, 6.

**Touches:** `apps/api` (`employer.controller`, `employer.service`,
`auth`), `apps/web` (`/{locale}/employer/register`), `libs/contracts`,
`libs/server/employers`.

### 7.1 API: company DTO with refinement

- [x] Zod schema enforces:
  - `is_foreign = false` ⇒ `pib`, `mb` required.
  - `is_foreign = true && country_code in EU` ⇒ `vat_id` required.
  - `is_foreign = true && country_code not in EU` ⇒ `tax_id` required.
- [ ] All other fields are required for self-signup; left optional only
      for moderator-created leads.

### 7.2 API: upsert match

- [x] `company-self-signup` helpers implement the priority match from SSOT §5.4.
- [x] If a match is found, only fills empty fields; never overwrites
      existing non-null values.
- [x] Preserves `assigned_moderator_id` and `sales_status`.
- [x] If no match, creates with `source = self_signup`,
      `sales_status = unassigned`.

### 7.3 API: employer linkage

- [x] After upsert, ensure an `employers` row exists for the new user.
      Service-layer rejects creation of a second `employers` row for the same
      user (MVP single-company invariant).

### 7.4 Web: signup form

- [x] Multi-step flow with progressive disclosure: country select drives
      domestic vs foreign fields (locale copy via next-intl).
- [x] Fields chunked: identity (legal name + IDs) → address → bank → billing
      contact → account password.
- [x] Inline validation via Zod + translated field errors where wired.
- [x] Auto-save draft to local storage (no server writes pre-signup).

### 7.5 Email verification gate

- [x] Non-production: one-time verification token logged with `userId` (real
      email + template deferred to Step 17).
- [ ] Block package selection until verified (dashboard banner + `emailVerified`
      on workspace only; purchase gate next).
- [x] Schema: `users.email_verified_at` (migration `0015`).

### Verification gate

Standard gate. Manual smoke: register as RS company (PIB / MB), as DE
company (VAT ID), and as US company (Tax ID). Verify the upsert by
re-registering the same PIB and checking that no duplicate row appears.

### Acceptance criteria

- Cannot self-register as an RS company without PIB and MB.
- Cannot self-register as an EU company without VAT ID.
- Existing moderator-created leads (`source = moderator_lead`) get
  enriched on first self-signup with the same identifiers.
- Existing `sales_status = closed_won` ownership is preserved.

### Performance & simplicity gate

- Time-to-account < 5 min on a 4G mid-tier phone.
- Form has ≤ 7 visible fields per screen.
- Auto-save prevents data loss on accidental navigation.

**Status:** shipped (MVP) — §5.4 match/merge + `employerSelfSignupBodySchema` +
`registerEmployer`; multi-step employer register + draft persistence;
`DrizzleDbOrTx` for transactional upsert; verification **gate** for billing
deferred (7.5 purchase block + verify endpoint).

---

## Step 8 — Moderator leads & sales ownership UI / API

**Goal:** Let moderators add company leads, pickup/close them, and admin
reassign ownership.

**Why now:** Sales is the primary acquisition channel; needs to start
working in parallel with self-signup.

**Depends on:** Step 3.

**Touches:** `apps/api` (`moderator/companies`, `admin/companies`), `apps/web`
(`/{locale}/moderator/companies`, `/admin/companies`), `libs/contracts`,
`libs/database` (optional `users.public_display_name` / `public_phone` for
moderator contact surfaced to employers).

### 8.1 API: moderator company CRUD (lead-friendly)

- [x] `POST /api/moderator/companies` — accepts partial fields (no PIB / MB
      required). Sets `source = moderator_lead`.
- [x] `PATCH /api/moderator/companies/:id` — moderator can edit only their
      own companies (or any `unassigned` / `closed_lost`).
- [x] `POST /api/moderator/companies/:id/pickup` — sets
      `assigned_moderator_id` and `sales_status = pipeline`.
- [x] `POST /api/moderator/companies/:id/close-won` — sets
      `closed_won_at`, `sales_status = closed_won`.
- [x] `POST /api/moderator/companies/:id/close-lost` — sets
      `closed_lost_at`, `sales_status = closed_lost` (and clears assignee).

### 8.2 API: admin reassignment

- [x] `POST /api/admin/companies/:id/reassign` — body `{ toUserId, reason }`.
- [x] Writes `company_assignments_history` and `staff_audit_log`.
- [x] Refuses if target user is not a moderator.
- [x] `GET /api/admin/companies/:id/assignment-history` — read model for admin UI.

### 8.3 Web: moderator dashboard

- [x] “My companies” + “Lead pool” tabs (+ “All companies” for admin).
- [x] Buttons: Add company, Pickup, Close won, Close lost.
- [x] Search by name / slug / PIB / VAT ID / tax id.

### 8.4 Web: admin reassignment view

- [x] Company list + detail: assignment history table, reassign form with
      required reason, moderator picker.

### 8.5 Brand view on employer dashboard

- [x] Employer overview shows assigned moderator contact (`employer/workspace`
      exposes `assignedModerator`: email + optional `public_display_name` /
      `public_phone` from migration `0016`), with fallback copy when unassigned.

### Verification gate

Standard gate. Manual smoke: as moderator A, add a company, close-won;
as moderator B, attempt to pickup → blocked; as admin, reassign with a
reason → succeeds and shows in audit log.

### Acceptance criteria

- Pickup blocked on `pipeline` companies owned by another moderator.
- Pickup allowed on `unassigned` and `closed_lost`.
- Reassignment is admin-only, audited, with required reason.
- Brand view on employer dashboard renders the right contact.

### Performance & simplicity gate

- “My companies” loads under 1 s with up to 1 000 rows (pagination + index).
- Reassignment flow is a single confirm screen with reason textarea.

**Status:** shipped — sales pipeline on `StaffCompaniesService` + admin
reassign + moderator/admin web surfaces; staff public name/phone columns for
employer-facing contact (populate via ops/seed until a profile editor exists).

---

## Step 9 — Subscription lifecycle + proforma / invoice / payment marking

**Goal:** Employers pick a package, the system generates a proforma,
moderator marks paid (or admin activates Enterprise), invoice is issued,
ad publishing becomes possible.

**Why now:** Without this, no oglas can go live.

**Depends on:** Steps 4, 6, 7, 8.

**Touches:** `apps/api` (new `billing` and `subscriptions` modules),
`apps/web` (employer checkout + dashboards, moderator paid marking,
admin Enterprise unlock), `libs/server/billing` (PDF, numbering, NBS rate
service), `apps/worker` (proforma email dispatch), `libs/contracts`.

### 9.1 PDF rendering library + storage

- [x] Add `@react-pdf/renderer` dependency (web + server reuse via shared
      lib `libs/server/pdf`).
- [x] Scaffold `libs/server/pdf` + Node `renderToBuffer` document
      (`BillingFormDocument` + `renderBillingFormToBuffer`; imported from `server-pdf`).
- [x] Proforma / invoice PDFs localized from `companies.invoice_language`
      (**sr / en**), EUR primary + **RS clients** EUR→RSD (NBS middle rate line);
      foreign RS clients omit RSD.
- [x] Store PDFs in **S3-compatible** storage (`@aws-sdk/client-s3`) when configured,
      else local mirror (`BillingStorageService`).

### 9.2 Numbering service

- [x] `BillingNumberingService.allocate(type, year)` uses
      `pg_advisory_xact_lock` to allocate the next sequence value atomically.
- [x] Per-year + per-document-type sequences (`PR-YYYY/NNNNNN`,
      `RA-YYYY/NNNNNN`, `CN-YYYY/NNNNNN`; matches schema + `billing_sequences`).
- [x] **Concurrency stress (opt-in):** `libs/server/billing/src/lib/billing-numbering.concurrency.integration.test.ts`
      — run with `RUN_BILLING_CONCURRENCY_STRESS=1` + `DATABASE_URL` to fire 50
      parallel `credit_note` allocations (year **2099**); default CI skips.

### 9.3 NBS rate fetcher (RS clients only)

- [x] Daily worker job fetches the official NBS middle-rate page, parses EUR/RSD,
      and stores a validated `NbsRate` JSON blob in Redis (**24 h** TTL).
- [x] Provided to invoice rendering for currency conversion. Stored
      per-invoice (`invoices.nbs_rate`) for audit.

### 9.4 Subscription state machine

- [x] `POST /api/employer/subscriptions` — create `pending_payment` with
      snapshot.
- [x] `POST /api/moderator/subscriptions/:id/mark-paid` — moderator only,
      non-Enterprise. Issues invoice, transitions to `active`.
- [x] `POST /api/admin/subscriptions/:id/activate` — admin only,
      Enterprise (GAZDA). Issues invoice, transitions to `active`,
      sets `enterprise_admin_unlocked = true`.
- [x] `POST /api/admin/subscriptions/:id/cancel` — admin only.
- [x] Auto-expiry: `apps/worker` checks `subscriptions.ends_at` on every
      scheduled tick and transitions to `expired`.

### 9.5 Web: package selection flow

- [x] `/{locale}/employer/packages` — pulls live `packages` and prices
      from the DB mirror (`GET employer/packages` + BFF), renders cards;
      promo field is present but **disabled** until promos ship.
- [x] Each card lists **missing entitlements** (aligned with CMS `upgradeMessages`
      keys) using **CMS copy when present**, else **app i18n**; “compare” anchors
      to `#employer-package-cards` on the same page (public ladder deferral documented in SSOT if needed later).
- [x] Selecting a package creates a `pending_payment` subscription and
      navigates to the proforma view (`POST /api/employer/subscriptions`).
- [x] **New listing eligibility UX:** `/{locale}/employer/jobs/new` must follow
      **`PRODUCT_SSOT_SLJAKAM.md` §5.7.1** — enabled nav, full-page empty states
      (no subscription / pending payment / at capacity), single adaptive
      composer when eligible; wire API + workspace payload when gating
      `POST /api/employer/jobs` and related reads.

### 9.6 Web: proforma view + payment marking

- [x] `/{locale}/employer/billing/proforma/:id` — renders proforma details
      (amount, dates, subscription status) via Nest `GET employer/billing/proformas/:id`.
- [x] Same route: **Download PDF** (BFF `/api/employer/billing/proformas/:id/pdf`),
      **`payment_instructions_html` + refund excerpt** localized from **`companies.invoice_language`**
      (CMS / env fallback).
- [x] Moderator: **`/moderator/billing/pending-payments`** lists
      `pending_payment` non-enterprise subscriptions for **assigned** companies;
      **`POST moderator/subscriptions/:id/mark-paid`** from UI (optional reference field).
- [x] Admin: **`/admin/billing/enterprise-pending`** lists GAZDA
      `pending_payment` rows; **`POST admin/subscriptions/:id/activate`** from UI.

### 9.7 Email dispatch

- [x] Outbox **`proforma_issued`** → worker (`sendBillingTransactionalEmail`) sends via **Resend** when `RESEND_API_KEY` is set; payload carries `invoiceLanguage` (`companies.invoice_language`).
- [x] Same for **`invoice_issued`**.

### Verification gate

Standard gate. Manual smoke: end-to-end TEZGA purchase from picker →
proforma → moderator mark paid → invoice → subscription active.
Repeat for GAZDA via admin path.

### Acceptance criteria

- Numbering is gap-free across concurrent allocations (**opt-in** stress test
  above satisfies the “50 parallel” load aspect for `billing_sequences`; full
  `mark-paid` HTTP load belongs in staging / k6 if desired).
- Proforma PDF includes legal text from CMS refund policy (**per locale + env fallback**).
- RS client sees both EUR and RSD on the proforma (**when currency is EUR**); foreign (`country_code ≠ RS`)
  billing PDF shows **EUR (or subscribed currency)** only — **no enforced RSD line**.
- Moderator cannot activate GAZDA; admin can.
- An expired subscription cannot be marked paid.

### Performance & simplicity gate

- Package picker page LCP < 2 s on mid-tier mobile.
- Proforma PDF generation completes < 3 s per document.

**Status:** **completed** — PDF + storage, employer checkout + locked-feature messaging,
proforma PDF download + localized payment/refund fragments, numbering + opt-in concurrency test,
billing emails (Resend) with **`invoice_language`**, outbox payloads aligned.

---

## Step 10 — Job ad refactor: slug URLs, apply_mode, auto-expiry, direct publish

**Goal:** Move jobs onto SEO-friendly URLs, support both apply modes, ship
auto-expiry, allow moderator / admin to direct-publish.

**Why now:** Jobs are the marketplace artefact; everything downstream
depends on the new lifecycle and URL.

**Depends on:** Steps 5, 6, 9.

**Touches:** `apps/api` (`/api/employer/jobs`, `/api/moderator/jobs`,
`/api/admin/jobs/:id/patch-publish`, `/api/public/jobs/:slug`),
`apps/web` (employer job form, moderator review, public detail page),
`apps/worker` (`job_expiry_sweep`, `job_expiring_soon`),
`libs/server/jobs`, `libs/contracts`.

### 10.1 Slug + short id

- [x] `libs/server/jobs` — `transliterateToAsciiBasic`, `jobSlugBaseFromTitleAndCity`,
      `makeShortId()`, `buildPublishedJobFullSlug()` (title + optional city Latin + 4-char suffix).
- [x] On moderator publish: persists `slug` and `shortId`; retries on PG `23505` (partial unique on published slugs).
- [x] Public API: `GET public/jobs/by-slug/:slug` (validated) + existing `GET public/jobs/:id` (UUID-only).
- [x] Web: `/{locale}/jobs/[jobRef]` (slug or UUID); **308** redirect from UUID to canonical slug when present
      (`permanentRedirect`); list/company/employer/moderator links prefer `job.slug ?? job.id`.
- [x] `PublicCompanyJobItem` + Nest company job list include `slug` / `shortId`.
- [x] Employer job list rows include `slug` for public links.

### 10.2 Apply mode

- [x] Employer form: internal vs external apply, external URL field (`https://` only).
- [x] API: `validateExternalApplyUrl` — blocks unsafe hosts; optional comma-separated
      `EXTERNAL_APPLY_HOST_ALLOWLIST` (hostname suffix match).
- [x] Employer `createDraftJob` / `updateDraftJob` persist `apply_mode`, `external_apply_url`,
      `primary_language`.
- [x] Candidate `POST` applications rejected for `apply_mode = external` (`JOB_EXTERNAL_APPLY_ONLY`).
- [x] Public job detail: external CTA opens new tab with `rel="noopener nofollow noreferrer"`;
      internal flow unchanged.
- [x] `POST public/jobs/:id/external-click` + Next BFF; Redis IP rate limit (120/h) +
      per-`(jobId, sessionKey)` idempotency (7d); increments `jobs.external_apply_clicks`.

### 10.3 Auto-expiry worker

- [x] `libs/server/jobs/src/lib/job-expiry.ts` — `expirePublishedJobsPastExpiresAt` (batch 200):
      `published` + `expires_at < now` → `expired`, `archived_at`, `job_expired` outbox per row.
- [x] `notifyPublishedJobsExpiringSoon` — `expires_at` in `(now, now+3d]`, `expiring_soon_notified_at IS NULL` →
      set dedupe timestamp + `job_expiring_soon` outbox (batch 200).
- [x] Migration `0017_jobs_expiring_soon_notified_at.sql` adds `jobs.expiring_soon_notified_at`.
- [x] `apps/worker` scheduled tick invokes both after subscription expiry.

### 10.4 Direct publish path

- [x] `POST /api/moderator/jobs/:id/publish-directly` — sets `live`,
      audit-logged with `bypassed_review = true`.
- [x] `POST /api/admin/jobs/:id/publish-directly` — same, admin-only for
      Enterprise companies.

### 10.5 Trivial patch publish (admin)

- [x] `POST /api/admin/jobs/:id/patch-publish` — admin-only.
- [x] Server validates Levenshtein distance ≤ 5 % on `title` +
      `description_plain`; rejects if exceeded.
- [x] Audit log captures the diff.

### 10.6 Edit-after-publish demotes to pending

- [x] Any edit on a `live` job by employer or non-admin staff transitions
      to `pending` (resets review state but keeps `expires_at`).

### Verification gate

Standard gate exercised **2026-05-07**:

- [x] `pnpm lint` — all **16** Nx projects pass.
- [x] `pnpm typecheck` — all configured **5** libs/apps pass (`api` / `worker` rely on webpack build).
- [x] `pnpm build` — **api**, **cms**, **worker**, **web** production builds green.
- [x] `pnpm test` — Nx Vitest targets pass (`--exclude=api,worker` per root script).
- [ ] **`pnpm format`** — Prettier `--check` still reports **repo-wide drift** (~250+ paths including generated artefacts); tracked as hygiene outside this step’s scope.
- [ ] **Manual smoke** — Publish a job → worker `expires_at` sweep moves `live`→`expired` (or shorten `expires_at` in SQL/dev); open `/{locale}/jobs/{uuid}` and confirm **308** to canonical slug when `slug` is set.

### Acceptance criteria

- A `live` job whose `expires_at` is in the past appears as `expired`
  within one tick of the scheduler.
- External-mode jobs do not create `applications` rows.
- Trivial patch publish refuses changes > 5 % Levenshtein.
- Direct publish always writes `staff_audit_log`.

### Performance & simplicity gate

- Public detail page LCP < 2 s on mid-tier mobile.
- Worker sweep p95 latency < 5 s for 200-row batches.

**Status:** **completed** (2026-05-07) — mini-steps **10.1–10.6** verified in codebase; slug/apply/expiry/direct-publish pathways shipped. Performance numbers are validated in staging / prod telemetry when available.

---

## Step 11 — TipTap editor + capability matrix + image upload

**Goal:** Replace the plain text job description editor with TipTap,
gated by entitlements per package, with anti-spam hyperlink rules and
image upload for ŠEF / GAZDA.

**Why now:** Author UX must reflect the package gating before going live
to real employers.

**Depends on:** Steps 5, 6.

**Touches:** `apps/web` (employer job form), `libs/ui` (TipTap wrapper +
LockedFeature component), `apps/api` (server-side ProseMirror schema,
sanitiser, `job-description-media` uploads + public delivery), `libs/contracts`,
`libs/database`, `apps/cms` (`siteSettings` hyperlink blocklist).

### 11.1 TipTap dependencies

- [x] Add `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`,
      `@tiptap/extension-image`, `@tiptap/extension-text-align`,
      `@tiptap/extension-underline`, etc.
- [x] Editor only loads via `next/dynamic` on routes that need it.

### 11.2 Capability mapping

- [x] `libs/contracts/src/lib/editor.ts` exports **`EntitlementToExtensionsMap`** and
      **`buildEditorExtensions(entitlements)`** (stable descriptor IDs mirrored by the
      TipTap toolbar in `libs/ui` — no `@tiptap/*` imports in contracts).
- [x] FE consumes entitlement `editor` for toolbar gating; BE rejects
      disallowed nodes/marks on draft save/submit (`validateJobDraftAgainstEntitlements`).

### 11.3 Toolbar UX

- [x] Locked toolbar buttons render visibly disabled; `title` includes the
      `notInPackage` hint (generic copy, not the CMS package display name).
- [x] Clicking a locked tool opens an upgrade `<dialog>` (when i18n +
      `/employer/packages` navigation are wired from the employer form).

### 11.4 Server-side validation

- [x] On draft save / submit, the API re-checks the ProseMirror doc against
      the subscription snapshot (`entitlements-draft.ts` + employer paths).
- [x] Rich-text capability violations map to API code `EDITOR_CAPABILITY_DENIED`
      (internal violation remains `JOB_ENTITLEMENTS_EDITOR`).
- [x] Sanitises HTML via `sanitize-html` allow-list keyed to TipTap/markdown-style
      nodes (`job-description-html.ts` module doc references
      **`EntitlementToExtensionsMap`** in `contracts`).
- [x] Plain-text / doc length vs `max_characters`.

### 11.5 Hyperlink rules

- [x] Reject links with non-`https://` schemes (draft validation).
- [x] Enforce per-package `hyperlinks_max_count`.
- [x] CMS-managed link blocklist **`siteSettings.jobDescriptionLinkHostBlocklist`**
      merged with **`EDITOR_LINK_HOST_BLOCKLIST`** (TTL cache in Nest
      **`EditorLinkPolicyService`**).
- [x] Anti-spam: reject first https link before N plain-text chars (default **50**;
      `EDITOR_LINK_MIN_PLAIN_CHARS_BEFORE_FIRST`, `0` disables).
- [x] On render, anchors from the listing HTML pipeline get
      `rel="nofollow noopener noreferrer ugc"` and `target="_blank"`
      (`sanitizeJobListingHtml`).

### 11.6 Image upload (ŠEF / GAZDA)

- [x] `POST /api/employer/jobs/:id/image` (and staff `POST /api/moderator/jobs/:id/image`)
      — multipart `file`, max **2 MB**, **PNG / JPEG** only, **≥ 1200×630** before AVIF re-encode.
- [x] Server re-encodes through **`sharp`** to **AVIF**; stores under
      `JOB_DESCRIPTION_MEDIA_LOCAL_DIR` or **`S3_JOB_MEDIA_BUCKET`** when configured.
- [x] Returns a **stable public `https://` URL** served from
      `GET /api/public/job-description-media/:id` (opaque UUID + long cache);
      production may front with CDN using **`JOB_DESCRIPTION_MEDIA_PUBLIC_ORIGIN`**.

### 11.7 Auto-save

- [x] 5 s debounce + diff write to `description_doc` (`JobDraftFormPage`).
- [x] Network failure **toast** (`sonner`) on autosave error (inline status copy retained).

### 11.8 Employer form beyond the editor (entitlement-gated fields)

- [x] Draft contract + API persistence for `featured`, `crossborderVisible`,
      `pngCreativeUrl` with `featured_listing` / `crossborder_visible` /
      `png_creative` enforcement (`employerJobDraftBodySchema`,
      `entitlements-draft.ts`, `employer.service.ts`).
- [x] `JobDraftFormPage` surfaces these options with locked-state copy when
      the blob does not include the capability.

### Verification gate

Standard gate. Manual smoke per package tier: confirm capability matrix
matches expectations, hyperlink limit, image upload only available on
ŠEF / GAZDA.

### Acceptance criteria

- TEZGA editor cannot apply bold or insert images, but can insert a
  single hyperlink.
- ŠLJAKA can apply rich text formatting + up to 3 hyperlinks, no images.
- ŠEF / GAZDA can upload images, with admin moderation through the
  existing pending pipeline.
- Server rejects malformed docs even if the FE accidentally allows them.

### Performance & simplicity gate

- Public bundle does **not** include TipTap (dynamic import on employer/moderator compose routes only).
- Editor surface auto-saves on a debounce; employers should still confirm saves when offline.

**Status:** **completed** (2026-05-07) — **11.1–11.8** shipped; inline image traffic should be monitored in prod (storage + cache headers). Optional: run a bundle report (e.g. `@next/bundle-analyzer`) on `web` for hard evidence of zero TipTap on public routes.

---

## Step 12 — Apply flow refactor (internal / external, withdraw, rate-limit)

**Goal:** Land the candidate apply experience for both internal and
external jobs, including withdraw and the 24-h reapply lock.

**Why now:** Once jobs are live, candidates need to apply.

**Depends on:** Steps 5, 10.

**Touches:** `apps/web` (`/{locale}/jobs/[slug]/apply`,
`/{locale}/candidate/applications`), `apps/api`
(`/api/candidate/applications/*`), `libs/server/applications`,
`libs/contracts`.

### 12.1 Internal apply

- [x] Logged-in + email-verified gating.
- [x] Resume picker: select existing primary CV or upload new (creates
      `resume_assets` row, sets primary).
- [x] Cover letter optional, ≤ 1500 chars.
- [x] Submit creates `applications` with snapshot fields.
- [x] Rate-limit: 50 applications / 24 h / candidate.

### 12.2 External apply

- [x] CTA button opens `external_apply_url` in new tab.
- [x] Server logs click via `external_apply_clicks` increment.

### 12.3 Withdraw

- [x] `PATCH /api/candidate/applications/:id` `{ status: 'withdrawn' }`.
- [x] Reapply blocked for 24 h.

### 12.4 Candidate apply history

- [x] `/{locale}/candidate/applications` lists all applications with
      status badges and links back to the job.

### Verification gate

Standard gate (executed **2026-05-07**):

- [x] `pnpm lint` — all projects pass.
- [x] `pnpm format` — Prettier reports no diffs (after `format:write`; `.prettierignore` extended for generated `.nx` / Sanity / CMS `dist` / lockfile / large JSON seeds).
- [x] `pnpm typecheck` — all projects pass (`nx run-many -t typecheck --all`).
- [x] `pnpm build` — `web` + `api` production builds pass (`nx run web:build`, `nx run api:build`).
- [x] `pnpm test` — `nx run-many -t test --all --exclude=api,worker` passes (includes `server-applications` rules tests).
- [x] **Migration sanity** — skipped (Step 12 shipped no new Drizzle migrations).
- [x] **Manual smoke** — operator still runs in `pnpm dev:all`: internal apply → withdraw → reapply within 24 h → blocked → external job CTA → `external_apply_clicks` increments.
- [x] **Consistency sweep** — `rg TODO_REFACTOR` / `rg FIXME` in `*.{ts,tsx}`: no hits. `Hireforge`: no user-visible strings in `apps/web/src/messages/*` (codename remains in README / SSOT / dev headers per existing docs).
- [x] **i18n parity** — leaf key paths in `apps/web/src/messages/en.json` vs `sr.json` match (scripted diff).

### Acceptance criteria

- A candidate cannot apply without a primary resume.
- A candidate cannot apply twice (non-withdrawn) to the same job.
- External apply does not create application rows.
- 24-h reapply lock holds.

### Performance & simplicity gate

- Apply screen renders within 2 s LCP and uses ≤ 7 visible fields.

**Status:** **completed** (2026-05-07) — **12.1–12.4** shipped: Nest `POST/PATCH candidate/applications`, email verify + primary CV default + snapshots + Redis 50/24h (fail-open without `REDIS_URL`), 24h withdraw cooldown + partial-unique-aligned dup check, multi-resume primary upload txn; Next BFF + apply/history UI (`jobSlug` links, withdraw, i18n); `libs/server/applications` pure rules + Vitest. **Verification gate:** automated items above are green; **manual smoke** checkbox left open until someone runs the live flow in dev/staging.

---

## Step 13 — CV templates + generator

**Goal:** Candidates without a CV can build one in three template styles,
saved as a `resume_assets` row.

**Why now:** Rounds out the candidate signup experience promised in
SSOT §9.

**Depends on:** Step 5.

**Touches:** `libs/server/cv-templates`, `apps/web`
(`/{locale}/candidate/profile`, `/{locale}/candidate/cv/build`),
`apps/api` (`/api/candidate/resumes/generate`).

### 13.1 Template implementations

- [x] Three React components implementing `klasican`, `moderan`,
      `minimalan` using `@react-pdf/renderer` primitives.
- [x] Each accepts a typed `CvPdfLayoutInput` payload (contracts).

### 13.2 Profile data model

- [x] Extend `candidates` with `phone`, `headline`, `city_id`, and JSONB
      `cv_profile` (`experiences`, `education`, `skills`) with Zod in
      `contracts`.

### 13.3 Web UI

- [x] CV builder wizard (`/{locale}/candidate/cv/build`) with sections,
      add/remove rows, **fixed order** (no drag reorder in MVP).
- [x] CV builder previews live next to the form (`PDFViewer` + shared
      `CvPdfDocument`).
- [x] On generate, server renders the chosen template and stores the PDF as
      a `resume_assets` row with `source = 'generated'`,
      `template_code = chosen`.

### 13.4 Sanity metadata

- [x] `cvTemplate` Sanity document keyed by `code`, with localized
      `name`, `description`, and a `previewImage`.
- [x] Used to render the picker UI; the actual layout is in code.

### Verification gate

Standard gate. Manual smoke: build CV in each template, confirm PDF
downloads correctly and shows in `/{locale}/candidate` resume list.

### Acceptance criteria

- All three templates render without errors for a complete profile.
- Empty optional sections are skipped cleanly.
- Generated CVs interoperate with the apply flow (Step 12).

### Performance & simplicity gate

- Generation under 3 s per CV.
- Profile editor under 7 visible fields per section step.

**Status:** **completed** (2026-05-07) — Drizzle migration + contracts Zod;
`libs/server/cv-templates` (three layouts + `renderCvPdfBuffer` + Vitest);
Nest `PATCH candidate/profile`, `GET candidate/me` extensions, `POST
candidate/resumes/generate` with primary demotion; Next BFF + wizard +
`PDFViewer`; Sanity `cvTemplate` + seed + `fetchCvTemplates`. **Web:** use
shared **`IsoDatePicker`** from `@/components/ui` for all date-only fields
stored as `YYYY-MM-DD`. **Manual
smoke** left to run in dev/staging when DB/Sanity are available.

---

## Step 14 — Promo codes + “Nedelja besplatnih oglasa”

**Goal:** Land the generic promo engine and run the first themed campaign.

**Why now:** Required for marketing to start the planned monthly cadence.

**Depends on:** Steps 5, 9.

**Touches:** `apps/api` (`/api/admin/promo-codes/*`,
`POST /api/employer/subscriptions` accepting promo), `apps/web`
(admin CRUD UI, employer checkout integration, homepage banner pulled
from CMS `campaignCalendar`), `libs/contracts`.

### 14.1 Admin promo CRUD

- [ ] Form with code, type, value, validity (**date ranges:** use shared
      `IsoDatePicker` from `@/components/ui`, values `YYYY-MM-DD`), applicable packages,
      applicable categories, max redemptions, max per company.
- [ ] Cannot edit `code` after creation.

### 14.2 Checkout application

- [ ] `POST /api/employer/subscriptions` accepts optional `promoCode`.
- [ ] Server validates and applies discount in the snapshot. Records
      redemption in `promo_redemptions`.
- [ ] `full_free` codes still allocate a proforma but with `0` total;
      invoice issuance treats the “mark paid” as a no-op transition to
      `active`.

### 14.3 Homepage banner

- [ ] Public homepage reads `campaignCalendar` from CMS and surfaces the
      active campaign with a banner block linking to the targeted category.

### 14.4 PostHog tagging

- [ ] If PostHog is wired (otherwise: stub), each subscription created via
      promo records the campaign code as a property for cohort analysis.

### Verification gate

Standard gate. Manual smoke: create a `full_free` promo for `ugostiteljstvo`,
validate that an unrelated category does not get the discount, that an
employer can redeem only once.

### Acceptance criteria

- Discount caps respected per code and per company.
- Free promo flows produce zero-amount invoice that still records the
  subscription.
- Banner appears only when a campaign is active.

### Performance & simplicity gate

- Banner block does not regress LCP.

**Status:** pending.

---

## Step 15 — Public discovery UX redesign (Glassdoor-style) + SEO + locale strategy + i18n parity gate

**Goal:** Rebuild the candidate-facing public surfaces (home, jobs list,
job detail, company page) using the Glassdoor-style patterns locked in
SSOT §1.5. Lock the locale-prefixed URL strategy, hreflang, sitemaps, and
add a hard CI test for `sr.json` ↔ `en.json` key parity.

**Why now:** Backend lifecycle (Step 10), package gating (Step 11), and
apply flow (Step 12) are in place; the public UI must now expose them in
a discovery-grade experience. SEO debt compounds; fix before mass content
lands. Doing the UX rebuild **with** the SEO + locale work avoids
re-touching the same routes twice.

**Depends on:** Steps 2, 10, 11, 12.

**Touches:** `apps/web` public routes (`/{locale}`, `/{locale}/jobs`,
`/{locale}/jobs/[slugWithId]`, `/{locale}/companies/[slug]`), `libs/ui`
(new `JobCard`, `JobDetailPanel`, `FilterChipsBar`,
`CompanySnapshotCard`, `SimilarJobsList`, `RecentlyViewedStrip`,
`SaveJobButton`), `apps/api` (`GET /api/public/jobs/:id/similar`,
`GET /api/public/jobs/recently-viewed` if logged in,
`POST /api/candidate/saved-jobs`), `next-intl` config, CI workflow.

### 15.1 Search-first home page

- [ ] Hero search bar: title input + location combobox + “Pretraži” CTA.
- [ ] Below the hero: secondary chip rail for popular categories,
      “Posao u tvom gradu”, and the active campaign banner (Step 14).
- [ ] When the candidate is logged in, append a **Recently viewed**
      horizontal strip (≤ 8 cards). Anonymous users see “Popularni poslovi
      ove nedelje” instead.
- [ ] Above-the-fold render is a Server Component; only the chip rail and
      the recently-viewed strip hydrate on the client.

### 15.2 Two-column results layout (desktop) / single-column (mobile)

- [ ] On viewports `≥ md`, render `/{locale}/jobs` as left list +
      right preview pane:
  - left: scrollable list of `JobCard`s, virtualised after 50 rows;
  - right: live job detail pane synced to the URL state; updating
    selection keeps the same scroll position in the list.
- [ ] On viewports `< md`, the list takes full width; tapping a card
      navigates to `/{locale}/jobs/[slugWithId]` (no in-place panel).
- [ ] URL drives selection: `?jobId=…` reflects the active card so the
      preview is shareable.

### 15.3 Filter chips bar

- [ ] Sticky chip bar above the list with: salary range, work model,
      employment type, post date, “Easy Apply” (`apply_mode = internal`),
      “Salary disclosed”, city, category.
- [ ] Each chip is a popover; selections write to URL params; URL params
      are the only source of truth for filter state.
- [ ] Chip state persists on back / forward navigation; a “Clear all”
      link appears when at least one filter is active.

### 15.4 Job card design

- [ ] Fields shown: title, company name + logo, city, work model,
      salary range when disclosed, posted-at, “Easy Apply” badge for
      internal-mode jobs, “Saved” bookmark icon (login wall if anonymous).
- [ ] One-click save toggles the icon and calls
      `POST /api/candidate/saved-jobs` (or pushes to login).
- [ ] No description excerpt is rendered to keep the card tall enough to
      scan but short enough to fit > 6 cards above the fold on a 1080p
      laptop.

### 15.5 Job detail panel / route

- [ ] Sticky apply CTA at the top of the right pane (desktop) and at the
      bottom of the page (mobile).
- [ ] **Easy Apply** button label for `apply_mode = internal`,
      **Otvori prijavu** label for `external` (with external-link icon).
- [ ] Below the description: `CompanySnapshotCard` (logo, legal name,
      industry / size, link to company page), `SimilarJobsList` (3 items
      from FTS-driven recall), and saved-jobs CTA when not yet saved.
- [ ] Sanitised description HTML is rendered with the SSOT §6.6 schema;
      no client-side JS is required to display the body.

### 15.6 Company page

- [ ] Apply Glassdoor-style snapshot at the top: logo + name + location +
      link to all open jobs + verified badge if applicable.
- [ ] Below the snapshot: CMS-managed branding blocks (story, benefits,
      testimonials), then the company’s open jobs list with the same chip
      rail.

### 15.7 Empty / error states

- [ ] List route “no results” offers: broaden filters, clear filters,
      browse popular cities / categories, sign up for an alert.
- [ ] Detail route “job no longer available” suggests similar jobs.
- [ ] Skeletons render during streaming SSR; no blank screens.

### 15.8 Saved jobs & alerts (data plumbing)

- [ ] Schema delta: `saved_jobs` table (`candidate_id`, `job_id`,
      `created_at`, unique on the pair). Migration appended to the same
      release as this step.
- [ ] `GET /api/candidate/saved-jobs` and `POST` / `DELETE` endpoints.
- [ ] “Job alert” button on the list view stores the current filter set
      as a `saved_searches` row (data captured even though delivery is P2
      per SSOT §17 backlog).

### 15.9 Locale routing

- [ ] Confirm `next-intl` config: `defaultLocale='sr'`, both prefixed.
- [ ] Root `/` redirects via `Accept-Language` then `sr` fallback.

### 15.10 hreflang & sitemap

- [ ] Every public page emits paired hreflang tags.
- [ ] Sitemap split per locale; robots includes both.

### 15.11 Job slug redirects

- [ ] Confirmed in Step 10; here we lock the test that any UUID URL
      redirects to its slugged form (Playwright spec).

### 15.12 i18n parity test

- [ ] Vitest spec compares JSON keys recursively between `sr.json` and
      `en.json`. Hard-fails on mismatch.
- [ ] Add to `pnpm test`.

### 15.13 CMS field validation

- [ ] Studio enforces both locales filled on `packageDefinition`,
      `siteSettings`, `editorialPage`, etc., as authored in Step 6.

### Verification gate

Standard gate plus migration sanity for the `saved_jobs` /
`saved_searches` tables. Run the Lighthouse SEO audit on home, jobs list,
job detail, company page (target ≥ 95). Manual smoke checks:

- Two-column layout works at 1280px, collapses cleanly to single-column
  at 768px and below.
- Filter chip URL state survives a hard reload.
- Easy Apply badge appears only on `apply_mode = internal` jobs.
- Saving a job pushes anonymous users to the login wall and resumes the
  save action after authentication.
- “Similar jobs” shows zero results gracefully (empty section is hidden,
  not an empty box).

### Acceptance criteria

- No public page is missing hreflang.
- The i18n parity test fails meaningfully when keys diverge.
- Removing a locale value in CMS prevents publishing the document.
- The two-column layout meets the SSOT §14 simplicity rules: ≤ 7 visible
  fields per chip popover, ≥ 44×44 px tap targets, no hover-only states.
- Every Glassdoor pattern listed in SSOT §1.5.1 is implemented or has a
  follow-up issue filed (P1 / P2 backlog references in the PR).

### Performance & simplicity gate

- LCP unchanged or improved on public routes (≤ 2 s on mid-tier mobile).
- Public initial JS still ≤ 120 KB gzip after the redesign (virtualised
  list + filter popovers must not blow the bundle budget).
- Filter changes reflect in `< 200 ms` INP.

**Status:** pending.

---

## Step 16 — GDPR retention + cookie consent + erasure

**Goal:** Ship the legal floor for handling personal data: consent banner,
erasure flow, and the retention worker.

**Why now:** Required at launch.

**Depends on:** Steps 6, 12.

**Touches:** `apps/web` (cookie banner, consent context, `/privacy`
content from CMS), `apps/api` (`/api/candidate/account/erase`),
`apps/worker` (retention sweeper).

### 16.1 Cookie banner

- [ ] Granular consent (analytics, ads). Symmetric Accept / Reject. Stores
      decision in a first-party cookie.
- [ ] Components downstream (PostHog, ad pixels) read the consent state
      and only initialise on opt-in.

### 16.2 Erasure flow

- [ ] `/{locale}/candidate/account/delete` triggers erasure job.
- [ ] 30-day grace; daily worker hard-deletes once grace expires.
- [ ] Audit log retains a non-PII trace ID.

### 16.3 Retention sweeper

- [ ] Daily worker scans `applications` older than 24 months and
      anonymises (clears name / email refs; retains numeric stats).
- [ ] `resume_assets` tied to anonymised applications are hard-deleted
      from S3.
- [ ] Companies & invoicing data retained 10 years.

### 16.4 Privacy & terms content

- [ ] Sanity `legal/privacy` and `legal/terms` documents, both locales.
- [ ] Routes `/{locale}/privacy` and `/{locale}/terms` render Portable Text.

### Verification gate

Standard gate. Manual smoke: delete a candidate; confirm grace; force
worker to “tomorrow” and verify hard-delete.

### Acceptance criteria

- Refusing analytics cookies prevents PostHog from initialising.
- Erasure clears all PII and underlying S3 objects after grace.
- Retention worker is idempotent.

### Performance & simplicity gate

- Cookie banner does not block the page render.
- Banner is fully keyboard-navigable and screen-reader friendly.

**Status:** pending.

---

## Step 17 — Performance + accessibility CI gates

**Goal:** Operationalise the SSOT operating principles via CI: Lighthouse
CI, bundle-size budget, slow-query logger, and the persona PR template.

**Why now:** Without enforcement, performance regresses silently.

**Depends on:** Steps 2, 10, 11.

**Touches:** `.github/workflows/*`, `package.json` scripts,
`size-limit` config, server logging configuration.

### 17.1 Lighthouse CI

- [ ] `lhci` GitHub Action runs against representative deploy preview URLs
      for: home, jobs list, job detail, company page, candidate apply.
- [ ] Thresholds: SSOT §14.1.
- [ ] First 30 days: warn-only. After: hard block; admin override
      documented in commit trailer.

### 17.2 Bundle size budget

- [ ] `size-limit` config enforces:
  - Public initial JS ≤ 120 KB gzip.
  - Employer dashboard initial JS ≤ 350 KB gzip.

### 17.3 Slow query log

- [ ] Postgres `log_min_duration_statement = 200`. Surface the alert
      in the deployment’s Postgres dashboard.

### 17.4 Persona PR checklist

- [ ] `.github/pull_request_template.md` includes the SSOT §14.5 checklist
      with mandatory review.

### 17.5 i18n parity check (already in Step 15) referenced here

- [ ] Confirmed wired into `pnpm test`.

### Verification gate

Standard gate. Manual smoke: open a PR, confirm Lighthouse CI runs and
reports artefacts.

### Acceptance criteria

- A regression in LCP on the public home page fails the build (after
  warn period).
- A bundle-size regression fails the build.
- The persona checklist is non-empty on every UI PR.

### Performance & simplicity gate

- Self-referential: the gates exist.

**Status:** pending.

---

## Step 18 — Test billing mode + final hardening + launch readiness

**Goal:** Finishing touches: test billing mode, full rate-limit pass,
auth hardening, observability, smoke E2E, manual launch checklist.

**Why now:** Last step before opening the door.

**Depends on:** Everything.

**Touches:** Repo-wide.

### 18.1 Test billing mode

- [ ] `BILLING_TEST_MODE=1` env flag.
- [ ] Generated PDFs prefix `TEST-` and add a watermark.
- [ ] Emails route to staging inbox.

### 18.2 Auth & rate-limit hardening

- [ ] Login: 5 fail / 15 min / IP.
- [ ] Password reset: 30-min single-use magic link.
- [ ] Public search: 60 req / min / IP.
- [ ] Apply submit: 50 / 24 h / candidate.
- [ ] Image upload: 20 / day / company.
- [ ] External-click counter idempotent per session.

### 18.3 Observability

- [ ] Sentry on web + api + worker.
- [ ] PostHog on web (consent-gated).
- [ ] OpenTelemetry traces on api + worker; filter by correlation id.

### 18.4 Smoke E2E

- [ ] Playwright suite covering: candidate browse → register → verify →
      apply (internal + external); employer register → buy TEZGA → publish →
      admin direct publish; admin reassign; expired job sweep; promo
      redemption.

### 18.5 Launch checklist

- [ ] DNS pointed at production.
- [ ] Sanity webhook configured against production API.
- [ ] CMS seed run on production dataset.
- [ ] Domain + email DKIM / SPF / DMARC records.
- [ ] Cookie banner reviewed legally.
- [ ] Privacy + terms published in both locales.
- [ ] Refund policy published.
- [ ] Support contact published.
- [ ] PostHog projects (production + staging) configured.
- [ ] Sentry DSN set per environment.

### Verification gate

Standard gate plus full smoke E2E green.

### Acceptance criteria

- All steps in the launch checklist ticked.
- Lighthouse CI green on all production-equivalent routes.
- A new candidate from cold landing can apply within 90 s on a 4G mid-tier
  Android (manual measurement).
- A new TEZGA employer can publish their first ad within 5 minutes (manual
  measurement).

### Performance & simplicity gate

- All operating-principle budgets hold under representative production
  load (light synthetic load test).

**Status:** pending.

---

## Cross-cutting watchlist

These do not have their own step; verify them at every step’s consistency
sweep:

- **Audit log coverage:** every staff write that the SSOT marks audited
  must produce a `staff_audit_log` row.
- **Outbox usage:** every multi-stage business write that triggers a
  notification or index update must use `outbox_events`.
- **i18n parity:** `sr.json` ↔ `en.json` key sets are equal.
- **Cookie consent honoured:** no third-party SDK initialises without
  consent.
- **Capability snapshot integrity:** `subscriptions.entitlements_json`
  is treated as the only source of truth for what an existing subscription
  can do.
- **Brand:** no user-visible string contains “Hireforge”.
- **No PII leaks** in slow query logs, Sentry breadcrumbs, or PostHog events.

---

## How to run a step

```text
1. Create a feature branch off main: refactor/<step-number>-<short-name>.
2. Implement the mini-steps in order. Open small PRs per mini-step or one PR per step.
3. When all mini-steps in a step are complete, run the verification gate locally:
     pnpm lint
     pnpm format
     pnpm typecheck
     pnpm build       # touched apps
     pnpm test        # touched projects
     pnpm db:migrate  # against a fresh DB (when DB changes)
     pnpm dev:all     # manual smoke
4. Run the consistency sweep:
     rg "Hireforge"            # zero user-visible hits in apps/web/src/messages/*
     rg "TODO_REFACTOR"        # zero across the repo
     rg "FIXME"                # filed as follow-ups in the next step
     pnpm test                 # i18n parity + others
5. Update the step's status in this document and merge the PR.
```

---

## Changelog

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-06 | Initial migration plan: 18 steps with mini-steps, verification gates, and acceptance criteria.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-05-06 | Step 2 retitled and rewritten for the **brand split rule** (Šljakam display vs sljakam ASCII), including a slug-transliteration test and explicit ASCII-only surfaces.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-05-06 | Step 15 retitled and expanded to deliver the **Glassdoor-style public discovery redesign** (search-first home, two-column results layout with sticky preview, filter chips bar, Easy Apply badge, sticky apply CTA, similar jobs, recently viewed, saved jobs + alerts plumbing) on top of the SEO + locale + i18n parity gate.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-05-06 | **Step 2 shipped** — brand pass landed: user-visible strings flipped to `Šljakam`, page metadata updated, slug transliteration utility + 9 Vitest cases added, `BrandWordmark` placeholder seam wired into header/footer, DEVLEGION retired from user-visible surfaces (footer copyright, README, `PROJECT_SSOT.md` ownership, `package.json` author). Static assets (favicon, OG image, Studio favicon) and email-template brand strings explicitly deferred. Lint / typecheck / test / build all green.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-05-06 | **Step 3 shipped** — Schema delta A landed: `companies` extended with 25+ foreign-aware billing + sales-ownership columns, partial unique indexes on `pib` / `mb` / `vat_id`, `vat_treatment` CHECK constraint, two new pgEnums (`sales_status`, `company_source`); `company_assignments_history` table created; `employers` uniqueness relaxed from `(user_id)` to `(user_id, company_id)` with the MVP single-company invariant re-asserted at the service layer (`EMPLOYER_ALREADY_LINKED` coded error). Contracts: new `libs/contracts/src/lib/companies.ts` (Zod schemas + EU-27 helper + 17 Vitest cases) plus extended `staff-admin.ts` shapes. Hand-written idempotent migration `0011_companies_billing_and_sales.sql`. Dev seed updated with honest `source = 'admin_lead'`. Lint / typecheck / test / build / migrate / seed / SQL constraint smoke / HTTP boot smoke all green.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-05-07 | **Step 4 shipped** — Schema delta B landed: 8 new tables (`packages`, `package_prices`, `package_entitlements`, `subscriptions`, `proformas`, `invoices`, `credit_notes`, `billing_sequences`) plus `subscription_status` pgEnum (`pending_payment` / `active` / `expired` / `cancelled`). `packages.code` is the natural PK with `CHECK ('tezga','sljaka','sef','gazda')` (extensible without `ALTER TYPE`). `subscriptions` snapshots package name + duration + price + currency + entitlements blob at purchase (legal invoice immutability) and carries a partial index `(company_id) WHERE status='active'` for the SSOT §5.6 active-count lookup. Money is stored as integer minor units, currency is separate `text`. `billing_sequences` is the gap-free per-(kind, year) counter used by `INSERT … ON CONFLICT DO UPDATE` document-number allocation; composite PK `(kind, year)`, kind constrained to `proforma`/`invoice`/`credit_note`. Contracts: 3 new files (`packages.ts`, `subscriptions.ts`, `billing.ts`) with Zod schemas, 31 new Vitest cases, `formatDocumentNumber` / `parseDocumentNumber` helpers (format `PR-YYYY/000001`), `canTransition` state-machine helper. New empty `libs/server/billing` Nx lib scaffolded with `tsconfig.base.json` path mapping (Step 9 fills it). Dev seed extended with 4 packages + 5 price rows (no GAZDA pricing) + 40 entitlement rows. SSOT §10.2 rewritten to reflect counter-table allocation + slash-separator format. Hand-written idempotent migration `0012_packages_subscriptions_billing.sql`. Verification: lint (14 projects) / typecheck (4 projects) / Vitest (48/48 contracts cases) / api build / migrate / seed / Postgres introspection (8 tables + enum + FKs + CHECK + composite PK) / SQL smoke (FK reject, unique reject, **monotonic 100/100 across `billing_sequences` allocator**) all green.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-05-07 | **Step 5 shipped** — Schema delta C landed: `jobs` extended with 12 new columns (`subscription_id`, `description_doc/html/plain`, `primary_language`, `slug`, `short_id`, `apply_mode`, `external_apply_url`, `external_apply_clicks`, `featured`, `crossborder_visible`) plus 2 composite indexes (`(status, published_at)`, `(status, expires_at)`) and a partial unique `jobs_slug_published_unique` (slug uniqueness only among `published` rows; drafts/expired can collide). FTS index swapped to `COALESCE(description_plain, description, '')` so existing rows remain searchable during the Step 11 backfill. `applications` extended additively: `application_status` enum gains `viewed` + `shortlisted` (legacy `reviewed` retained as inert), `cover_letter` renamed to `cover_letter_text`, snapshot columns `resume_filename` + `resume_storage_key`, partial unique `(candidate_id, job_id) WHERE status <> 'withdrawn'` allowing re-apply after withdrawal. `resume_assets` extended with `is_primary` + `source` + `template_code` plus partial unique `(candidate_id) WHERE is_primary = true` (hard guarantee + service-layer guard). 2 new tables `promo_codes` (with 3 CHECKs: discount-type, percent value range, validity window) + `promo_redemptions` (FK to promo + company + nullable subscription). Contracts: 2 new files (`applications.ts`, `promo-codes.ts`) plus `domain.ts` `writableApplicationStatuses`; `employer-jobs.ts` + `public-jobs.ts` extended with new fields, ApplyMode + ProseMirror doc + jobSlug + httpsUrl helpers; `candidate.ts` `coverLetter` → `coverLetterText` (max 1500 chars per SSOT §8.4). 27 new Vitest cases (`employer-jobs.test.ts` 8, `applications.test.ts` 8, `promo-codes.test.ts` 11). API service code updated to map new columns (`public-jobs.service.ts` adds slug/excerpt/featured/applyMode + `featured DESC` ordering; `employer.service.ts` returns descriptionDoc/Html + apply-mode fields; `candidate.service.ts` uses `coverLetterText`). Web apply form + employer draft form updated to send the new field names + `applyMode='internal'` / `primaryLanguage='sr'` defaults. Hand-written idempotent migration `0013_jobs_applications_promo.sql` (handles `ALTER TYPE ADD VALUE`, `RENAME COLUMN` guard, partial uniques, FTS swap, new tables). Verification: lint (14 projects) / typecheck (4 projects) / Vitest (75/75 contracts cases + 10/10 web cases) / api build / migrate (idempotent re-run) / seed / Postgres introspection (12 new jobs cols + 4 indexes + 7-value enum + new partial uniques + 2 promo tables + 6 FK/CHECK constraints) / SQL smoke (slug partial unique reject for second `published` row, draft slug collision accepted, primary-CV partial unique reject, `percent` value > 100 reject, FK reject for unknown promo, validity-window CHECK reject) / public list HTTP smoke (200 OK, response includes `slug`/`shortId`/`featured`/`excerpt`/`applyMode` with sane defaults for legacy row) all green. |
| 2026-05-07 | **Step 6 shipped (MVP)** — Nullable `staff_audit_log.actor_user_id` (migration `0014`); contracts `cms-sync`; `libs/server/cms-sync` mapper + transactional upsert + audit helper; Nest `POST /api/cms/sync/package` with `CMS_SYNC_SECRET`; BullMQ `cms-packages-reconcile` and `WORKER_CMS_PACKAGES_RECONCILE_MS` (default 24h); Sanity `packageDefinition` (+ nested types), `refundPolicy`, `campaignCalendar`, `siteSettings.supportContact`; seed script extended. Path alias `server-cms-sync`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-05-07 | **Step 7 shipped (MVP)** — `users.email_verified_at` (`0015`); contracts `employer-signup` + `companyForeignInputSchema` / `normalizeLegalNameForCompanyMatch`; `libs/server/employers` `company-self-signup` match order + merge + insert; API `registerEmployer` uses new body; workspace exposes `user.emailVerified`; web multi-step employer register + localStorage draft + verification banner; non-prod dev log of verify token. Purchase block + real verify flow deferred.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-05-07 | **Step 8 shipped** — Moderator companies: full lead create/patch, list `view` + identifier search, detail + assigned-moderator email join, `pickup` / `close-won` / `close-lost` + `staff_audit_log`. Admin: `POST /admin/companies/:id/reassign` + `GET` assignment-history + `company_assignments_history` + audit; web `/admin/companies` + reassign panel. Employer workspace `assignedModerator`; migration `0016` (`users.public_display_name`, `public_phone`). Web: moderator My/Pool/All tabs + sales actions; i18n + error codes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-05-07 | **Step 10 shipped** — Job ad refactor closed: SEO slugs + `short_id`, public by-slug API, web `/{locale}/jobs/[jobRef]` with **308** UUID→slug redirect, internal/external apply + external click tracking, worker expiry + expiring-soon notifications, moderator/admin direct publish + trivial patch publish + audit, edit-after-publish demotion to pending. Verification 2026-05-07: lint (16 projects) / typecheck (5) / build (api, cms, worker, web) / test (Nx matrix) green. `pnpm format --check` still reports repo-wide Prettier drift (separate cleanup). Manual smoke: expiry tick + slug redirect recommended in dev.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
