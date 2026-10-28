# Plan — Phase T: test coverage to the autofind level

Written 2026-10-28 in the clone `~/Dev/DEVLEGION/hireforge-tests`, branch
`docs/test-coverage-plan`, cut from `origin/main` at `a7adef7` (Phase B).
Written before implementation; the implementing agent ticks items off in the
log at the bottom and records what it skipped and why. Prompt to start it:
[`TEST_COVERAGE_PROMPT.md`](./TEST_COVERAGE_PROMPT.md).

Reference: autofind-platform `origin/main` at `42a0f7e` (2026-10-22, the
freshest of its ten worktrees), especially its `docs/TESTING.md`. Read files
there with `git -C ~/Dev/DEVLEGION/autofind-platform show origin/main:<path>`,
never by checking out a branch in one of its worktrees (they are in use).

> **No commits, no pushes (Stefan, 2026-10-28).** Nothing on this branch,
> or on any branch made in this clone for this work, is committed or pushed:
> no `git commit`, `git push`, PR, merge or deploy. All work stays as
> uncommitted changes in the working tree of `~/Dev/DEVLEGION/hireforge-tests`.
> Stefan reviews it and decides what to commit, how to split it, and when.
> This overrides any "commit per step" or "PR / merge / deploy" wording below
> or in other docs.

## Goal

Hireforge should catch regressions the way autofind does: every API route
proven against every role and every other company, the database and the
worker tested against real Postgres and Redis, every screen covered by
behaviour, a11y and visual tests, and gates that prove they go red. Matching
autofind's raw test count is a proxy. The real measure is the **registries**
(below): a new route, page or table without tests fails the build.

## Where things stand (2026-10-28)

### Test counts

|                                           | autofind `main`                            | hireforge `main`                  |
| ----------------------------------------- | ------------------------------------------ | --------------------------------- |
| Unit test files                           | 78                                         | 27                                |
| Integration files (real Postgres / Redis) | 56                                         | 1, opt-in and skipped by default  |
| Unit + integration cases (`it`/`test`)    | ~1 015                                     | ~150                              |
| E2E spec files                            | 62 (8 a11y, 16 visual)                     | 5                                 |
| E2E cases                                 | ~345, × 4 projects (375/1440 × light/dark) | ~30, 1 desktop project            |
| Visual baselines (Linux)                  | 253                                        | 0                                 |
| Tests for `apps/api` (12.5k lines)        | 45 files                                   | **0** (excluded from `pnpm test`) |
| Tests for `apps/worker` (1.4k lines)      | 8 files                                    | **0** (excluded)                  |
| Tests for `libs/database`                 | 14 files                                   | **0**                             |
| Tests for `apps/web` (28k lines)          | 26 unit files + all e2e                    | 5 small unit files                |
| Self-tests of the gates                   | `rules.test.ts`, `harness.test.ts`         | none                              |

Hireforge surface to cover: 16 Nest controllers with ~100 routes behind four
roles (candidate, employer, moderator, admin) plus internal/integration
routes, ~80 Next BFF route handlers under `apps/web/src/app/api`, 48 pages,
29 tables, and the worker outbox and schedulers.

### In motion elsewhere (do not duplicate)

**Phase C**: `~/Dev/DEVLEGION/hireforge`, branch `fix/phase-c-hardening`,
uncommitted, not pushed. It adds `users.token_version` (migration `0030`),
refresh revocation in `apps/api/src/auth/*`, and
`e2e/session-revocation.spec.ts`. Still to come per `PROGRESS.md`: worker
graceful shutdown, outbox "dead after N" plus a partial index, stable job
`short_id` on edit, Node 24 images, Caddy HSTS, and backups.

**SEO + quality gates**: `~/Dev/DEVLEGION/hireforge-seo`, branch
`feat/seo-quality-gates`. It has 1 local commit plus uncommitted work and was
cut from `a9ef74a`, i.e. **before Phase B**. A snapshot of its plan is in
[`SEO_AND_QUALITY_GATES.md`](./SEO_AND_QUALITY_GATES.md); the live copy stays
in that clone. That branch already brings, or plans to bring:

- vitest configs for `apps/api`, `apps/worker` and `libs/database`, and
  `--exclude=api,worker` removed from `pnpm test`;
- `auth-rate-limit.test.ts` (IP parsing only), `worker-log.test.ts`, and the
  merged-migration guard `libs/database/src/migrations.test.ts`;
- `check:i18n`, husky + lint-staged, and a pre-push hook with a fixed list of
  checks;
- an axe helper on public pages and the main logged-in screens;
- visual baselines for 6 public screens at 375/1440, Lighthouse and
  `seo:audit` (warn-only);
- JSON-LD builder unit tests, and SEO e2e specs (public job → apply →
  sign-in with `returnTo`, robots/sitemap, JSON-LD, landing pages, expired
  job noindex);
- E2E env for parallel stacks (`E2E_DB_NAME`, `E2E_REDIS_DB`,
  `E2E_API_PORT`, `E2E_WEB_PORT`), plus a fixed-clock and theme fixture.

Phase T builds on all of this and repeats none of it.

## Gap analysis: autofind layer → hireforge

Layers follow the table in autofind `docs/TESTING.md`.

| #   | Layer              | hireforge `main`             | In motion                              | Phase T adds                                                                                             |
| --- | ------------------ | ---------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | Static             | lint, tsc, prettier          | —                                      | jsx-a11y lint rules if missing (check first)                                                             |
| 2   | Project rules      | —                            | i18n (SEO), design (SEO, warn)         | —                                                                                                        |
| 3   | Unit               | contracts, a few server libs | JSON-LD, 2 small api/worker tests      | Untested libs; coverage thresholds on dense logic (T5)                                                   |
| 4   | Database           | 1 opt-in stress test         | migration immutability guard           | Testcontainers harness, migrations from empty, schema ↔ SQL drift, constraints, races, EXPLAIN (T1, T3) |
| 5   | API integration    | **none**                     | —                                      | Route registry, role matrix, company isolation, flows, contract conformance (T2)                         |
| 6   | Jobs               | **none**                     | —                                      | Outbox, retries, dead letters, schedulers, emails (T4)                                                   |
| 9   | Search quality     | none                         | —                                      | Golden queries incl. diacritics/Cyrillic, FTS index used (T3, T5)                                        |
| 10  | Performance        | none                         | Lighthouse (SEO, warn)                 | EXPLAIN checks (T3); first-load JS budget (T9, warn)                                                     |
| 11  | E2E behaviour      | 5 specs, desktop only        | 1 Phase C spec, 5 SEO specs            | Every role's stories at 375 + 1440, two-party flows in two contexts (T6)                                 |
| 12  | Accessibility      | —                            | axe on main screens (SEO)              | axe on **every** page and state, keyboard-only flows (T7)                                                |
| 13  | Visual             | —                            | 6 public screens (SEO)                 | Every page and state (T7)                                                                                |
| 15  | Security           | rate limit unit tests        | session revocation (C), IP parse (SEO) | Cookie flags, headers, token single-use, `returnTo` open redirect, IDOR, upload/download authz (T2, T8)  |
| —   | Gate self-tests    | —                            | —                                      | `rules.test.ts` + `test:harness` deliberate faults (T9)                                                  |
| —   | Selective pre-push | CI on every PR               | fixed pre-push list (SEO)              | `check:changed` ported from autofind (T9)                                                                |
| —   | Stack smoke        | —                            | —                                      | Build the 3 images, boot, health (T10, optional)                                                         |

Not ported: autofind's RLS tests (hireforge isolates companies in the app,
not with Postgres RLS), the importer, sync, PWA/push and passkeys/PIN.

## Decisions (recommended; Stefan confirms or flips)

1. **Integration infrastructure.** Options:
   - **A (recommended).** Testcontainers: one Postgres 16 + Redis 7
     container per run (same images as CI), a template database migrated
     once by the real `scripts/db/migrate.mjs`, one database per test file,
     one Redis DB index per Vitest worker. It is what autofind runs, so the
     `libs/testing` code ports almost as-is. Parallel runs and clones never
     collide. Cost: Docker is needed for `pnpm test:integration`.
   - **B.** Reuse the compose Postgres, as `scripts/e2e/run.mjs` does
     (`<db>_it_<n>` databases). No new dependency, but it depends on the dev
     stack running, and two clones share one server.
   - **C.** PGlite or mocks. Rejected: row locks, `FOR UPDATE`, FTS
     dictionaries and the numbering races are exactly what must be real.
2. **Where heavy suites run.** Options:
   - **A (recommended).** The autofind model. `pnpm test:integration` runs in
     a new `integration.yml` on push to `main` and on `workflow_dispatch`,
     **not on PRs**. Locally, `check:changed` runs it before any push that
     touches api/db/worker. This matches the SEO plan's "no new heavy jobs on
     PRs" rule.
   - **B.** Also run on PRs: safer, but more GitHub minutes.
   - **C.** Nightly only: cheapest, but breakage is found a day late.

   Whether the **existing** e2e job also leaves PRs is Stefan's call
   (`NEEDS_STEFAN.md`).

3. **Company isolation stays application-level.** Tests only, no Postgres
   RLS in this phase. If the matrix (T2) keeps finding holes, propose RLS as
   its own phase.
4. **Known bugs get `it.fails` tests** named after the `PROGRESS.md`
   "Known issues" entry, flipped to `it` when fixed. Examples: FTS seq scan,
   `đ` transliteration, and the `drizzle/meta` snapshot drift. A known bug
   never blocks the phase, and it never quietly disappears.

## Rules for this work

These come from autofind `docs/TESTING.md` and Stefan's `CLAUDE.md`.

- **Tests click like a person** in e2e: tap the result, not
  `goto('/jobs/123')`. Use `goto` only for setup and for URL-tampering
  security cases.
- **Prove each new test catches its bug:** run it once against the old code,
  or with the fix reverted, and record that it failed in the log below.
- **Behaviour sentences as names:** `an employer of another company gets 404
for a job's applications`.
- **Deterministic:** fixed clock (`E2E_NOW` / `useFixedClock()`), reduced
  motion, `Europe/Belgrade`, no retries, and no real third parties (Resend,
  NBS and Sanity are stubbed). A flaky test is a bug.
- **Real infrastructure where it matters:** locking, numbering, migrations,
  search and the outbox run against real Postgres and Redis, never mocks.
- **Don't touch app behaviour.** A test that finds a real bug: write it as
  `it.fails` with a short note in `PROGRESS.md` → "Known issues" (see the
  no-commit rule below for small fixes).
- **Migrations:** this phase adds none. If one becomes unavoidable, use the
  next free number after Phase C's `0030`, and never edit a merged one.
- **No commits or pushes** (see the top of this file). After each coherent
  step, run the full repo check from the root. Record in the log below the
  step, its files, the check result, and a suggested conventional-commit
  message, so Stefan can commit it as-is. A step whose check is red is
  marked red in the log, never left looking done.
- A real bug found by a test is **not fixed here** unless it's under ~20
  lines and obviously right. Then the fix sits in the working tree, and the
  log lists it as a separate suggested `fix(...)` commit.

## Conflict control (why this lives in its own clone)

Phase C and SEO are both unpushed and touch shared files. Phase T sticks to
**new files** until they merge:

| File / area                                                                                  | Owner until merged | Phase T does                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/{api,worker}/vitest.config.mts`, `libs/database/vitest.config.mts`, `pnpm test` script | SEO                | Adds separate `vitest.integration.config.mts` files; leaves unit configs alone. Before SEO merges, a T-only unit config is allowed if needed, and is replaced by SEO's version once SEO is on `main` |
| `e2e/playwright.config.ts`, `e2e/support/fixtures.ts`, axe and visual helpers                | SEO                | T6–T8 start only after SEO's W5/W6 are on `main`                                                                                                                                                     |
| `.husky/*`, `lint-staged`                                                                    | SEO                | T9 replaces the static pre-push list with `check:changed` after SEO merges                                                                                                                           |
| `apps/api/src/auth/*`, worker outbox, `drizzle/0030*`                                        | Phase C            | Auth/session and outbox-dead-letter tests wait for Phase C on `main`                                                                                                                                 |
| `.github/workflows/ci.yml`                                                                   | shared             | T adds a **new** `integration.yml`; `ci.yml` edits only in T9                                                                                                                                        |
| `package.json`, `pnpm-lock.yaml`                                                             | shared             | Add devDeps once (T1). After pulling `main`, take main's lockfile and re-run `pnpm install`                                                                                                          |

Bring in upstream work by fetching only: `git fetch origin`, then `git stash
&& git merge --ff-only origin/main && git stash pop`. This works because the
branch has no commits of its own. Do it before each stage and after each
upstream merge. Resolve stash conflicts in the working tree, and never
commit to get past them.

## Stages

Sizes are relative (S < M < L). They depend only on what is merged: **T1–T5
can start now, T6–T8 wait for SEO, and the auth/outbox parts of T2/T4 wait
for Phase C.**

### T1 — `libs/testing` harness (M) · now

Port autofind `libs/testing` and adapt it.

1. **Presets.** `unitConfig()` / `integrationConfig()` presets in
   `libs/testing/src/vitest/preset.ts`. Unit configs exclude
   `*.int.test.ts`. Each config gets its own `testCache(import.meta.url)`.
2. **Containers.** Testcontainers global setup: Postgres 16-alpine and
   Redis 7-alpine on random ports. Logs say which phase failed, like
   autofind's `[integration] vitest exiting …` line.
3. **Template database.** Migrated once with the real migrate and seeded
   with RS locations and taxonomy (`scripts/db/seed-*`). Not the domain seed
   with its shared password: tests create their own users. Every test file
   gets `CREATE DATABASE … TEMPLATE`, dropped afterwards.
4. **Fixtures.**
   - `COMPANY_A` / `COMPANY_B` with overlapping legal names, slugs and
     similar PIB/MB, so isolation bugs show up.
   - Factories: company, employer, candidate (verified and unverified),
     moderator (with an assigned pipeline), admin, job (draft / submitted /
     published / expired), package + subscription, proforma/invoice, promo
     code (fixed with currency / percent / `full_free`), application, resume,
     saved job/search, join request, outbox event.
   - `testId()` and `useFixedClock()`.
5. **Stubs.** A recording Resend (reuse `e2e/support/fake-resend.mjs`
   logic), an NBS middle-rate HTTP stub and a Sanity client stub.
6. **API helpers.** `startApp()` boots the real Nest `AppModule` on the
   test database (supertest). `signIn(role, user)` goes through the real
   `POST /api/auth/*/login` and returns cookies.
7. **Wiring.** A root `pnpm test:integration` script
   (`nx run-many -t test:integration`), with targets for api, worker,
   database and server-billing. Move
   `billing-numbering.concurrency.integration.test.ts` into it so it always
   runs there, not only with `RUN_BILLING_CONCURRENCY_STRESS=1`.
8. **Workflow.** A new `.github/workflows/integration.yml` (push to `main` +
   `workflow_dispatch`, 30 min timeout).

**Done:** a toy `*.int.test.ts` per project passes, and two concurrent
`pnpm test:integration` runs use separate containers. A test proves both.

### T2 — API: registries and matrices (L) · now; auth parts after Phase C

The biggest gap. Phase A's company takeover was exactly the hole these
generators exist to close.

1. **Route registry** (`apps/api/src/route-registry.int.test.ts`). Read
   every route from the booted app (Nest's router/discovery, not a
   hand-kept list). Each route must be in exactly one bucket:
   `PUBLIC_ROUTES`, `SESSION_ROUTES`, `ROLE_ROUTES` (with roles),
   `INTERNAL_ROUTES` (token), or a registered isolation resource.
   - An unclassified route fails the test.
   - A public route must answer without a session; a role route must answer
     401 without one.
2. **Role matrix** `describeRoleAccess(route, expected)`. Every route ×
   {anonymous, candidate, employer, moderator, admin} → the expected
   2xx/401/403. Roughly 500 generated cases.
3. **Company isolation** `describeCompanyIsolation(resource)`. Port
   autofind's `describeTenantIsolation`.
   - **Employer A vs employer B:** list / read / update / delete / submit on
     jobs, job images, applications to a job, the company profile,
     subscriptions, proformas and the proforma PDF. B gets 404 and A's row is
     unchanged.
   - **Forged ids:** a forged `companyId` in body, query or header is
     ignored.
   - **Candidates:** candidate A vs B for applications, resumes and resume
     download, saved jobs, saved searches and the profile.
   - **Moderators:** moderator A vs B on assigned companies, per Phase A's
     moderator scoping.
   - **Positive controls:** each check also proves A still gets its own
     rows.
4. **Per-controller tests.** For each controller:
   - the happy path;
   - validation errors (contract violation → 400 with the coded error);
   - every 2xx response body parses with its `libs/contracts` schema
     (contract conformance).
5. **Flows at the API level:**
   - **Job lifecycle:** draft → submit → publish / reject /
     publish-directly → expire → unpublish / force-archive, plus
     patch-publish. Publish needs an active subscription.
   - **Billing:** proforma → mark-paid → activate → cancel; one live invoice
     per subscription; NBS rate stubbed; a purchase needs a verified email.
   - **Promo:** fixed codes carry a currency; the per-company cap holds;
     `full_free` (if unimplemented: `it.fails`, see Known issues).
   - **Applications:** verify-before-first-apply, duplicate apply, an
     employer sees it.
   - **Company signup and join requests:** signup matching PIB / MB / VAT /
     name → pending, then approve and reject.
   - **Staff pipeline:** pickup, close-won, close-lost, reassign plus
     assignment history; job composer bootstrap.
   - **Admin:** users, taxonomy, promo codes, enterprise activation, and an
     audit row written for each staff billing action.
6. **Security (API):**
   - rate limits on login, register, refresh and password reset, with real
     Redis, as the end-to-end counterpart to SEO's IP-parsing unit test;
   - cookie flags (HttpOnly, SameSite, Secure under
     `NODE_ENV=production`);
   - reset and verify tokens are single-use, expire, and are stored hashed
     only;
   - refresh rotation, and revocation through `token_version` (after Phase
     C);
   - dev endpoints are off and the prod env guard refuses to boot in
     production;
   - `internal` / `integration` routes reject callers without their token;
   - job image upload type and size limits;
   - public job-description media serves only media of published jobs.

**Done:** every route is in the registry and the matrix, every resource has
the isolation suite, and every controller has ≥ 1 flow test.

### T3 — Database (M) · now

1. **Migrations from empty** via the real migrate, on their own container.
   The journal matches the files (SEO's guard covers immutability; this
   covers "applies cleanly").
2. **`schema.ts` ↔ migrated database.** Every table and column in the
   Drizzle schema exists with the same type, nullability and default, and
   vice versa.
   - This catches drift from hand-written migrations, since `drizzle/meta`
     only holds the `0000` snapshot (Known issue).
   - Unique and partial indexes the code relies on are listed and must
     exist.
3. **Constraints:**
   - one live invoice per subscription (`0028`);
   - promo currency (`0029`);
   - `auth_tokens` uniqueness and expiry;
   - unique slugs;
   - FK behaviour on delete for company, job and user;
   - the outbox partial index (after Phase C).
4. **Races, as real parallel transactions:**
   - billing numbering (the existing test, now always on);
   - two moderators publish the same job → one wins, the other gets a clean
     409;
   - mark-paid twice;
   - promo cap at the limit;
   - two employers join the same company.
5. **Query plans with `EXPLAIN` helpers** (`explain()` / `usesIndex()`, from
   autofind):
   - public job search uses the FTS index (`it.fails` today: Known issue
     "seq scan");
   - the job list by company and the outbox poll use their indexes.

### T4 — Worker (M) · now; dead-letter/shutdown after Phase C

1. **Outbox path:** poll → queue → dispatch, end to end on real Postgres and
   Redis.
   - Re-delivery is idempotent: one email, not two.
   - Retries use backoff, and terminal failure writes the DLQ row
     (`outbox-dlq.ts`).
   - After Phase C: dead after N attempts; a stuck event doesn't block later
     ones; SIGTERM finishes the in-flight job.
2. **Every notification type** reaches the Resend stub with the right
   recipient, locale (`sr`/`en`) and links:
   - new application;
   - job published / rejected / expiring / expired;
   - join request decided;
   - every billing mail.
3. **Schedulers** (fake timers): job expiry, the "expiring soon" notice,
   the NBS middle rate (stubbed HTTP, failure keeps the last rate) and the
   CMS packages reconcile (stubbed Sanity).
4. **Boot:** env validation and the `worker_started` log.

### T5 — Unit depth + coverage thresholds (M) · now

1. **Coverage gate.** Add `@vitest/coverage-v8` and enforce
   **≥ 90 % lines and branches** in `pnpm test` for the dense logic:
   - `libs/contracts`: billing / promo / checkout math, packages,
     subscriptions;
   - `libs/server/billing`;
   - `libs/server/jobs`: entitlements, publish rules, and the description
     HTML sanitizer with XSS cases;
   - `libs/server/applications`, `libs/server/auth`, and `libs/shared`
     (transliteration; `đ` as `it.fails`).

   UI is covered by behaviour, a11y and visual tests, not by a number (as in
   autofind).

2. **Suites for untested libraries:**
   - `libs/server/employers`: the company-matching rules behind Phase A's
     takeover fix;
   - `libs/server/cms-sync`;
   - `libs/server/email`: every template renders in `sr` and `en` with no
     missing variables;
   - `libs/server/pdf` + `cv-templates`: extract the PDF text and assert the
     invoice / CV fields;
   - `libs/server/search`: a golden list of queries → expected matches,
     including diacritics and Cyrillic (`it.fails` where it doesn't fold
     yet);
   - `libs/database` helpers.
3. **`apps/web`, non-UI logic:**
   - the BFF proxy layer: forwards cookies, strips hop-by-hop and client
     headers it shouldn't pass, keeps the method allowlist, and maps API
     errors. Generate one parity test that every
     `apps/web/src/app/api/**/route.ts` targets a route in T2's registry;
   - the per-role refresh middlewares;
   - `returnTo` sanitising: no external origin, no `//evil`, no `javascript:`.
4. **Component tests** (Vitest + Testing Library, jsdom), only for dense
   client components: the CV build wizard, job composer/editor,
   checkout/promo form and apply form.

### T6 — E2E behaviour for every role (L) · after SEO merges

User stories per role at **375 and 1440** (projects; `@phone-only` /
`@desktop-only` tags as in autofind). They run in light mode only; looks and
a11y are T7. Two browser contexts wherever two people interact.

- **Candidate:** register → verify → build CV → apply → see the status;
  saved jobs and searches; profile edit; resume download; password reset
  (extend `account-email`).
- **Employer:** register a new company → pending → approved; create a job →
  submit → _(moderator context)_ publish → _(candidate context)_ apply →
  employer sees the application.
  - Buy a package with promo (extend `promo-codes`), view the proforma and
    PDF.
  - Edit a published job; its URL keeps working (after Phase C).
- **Moderator:** queue → publish / reject with a reason / publish directly;
  company pipeline pickup / close-won / close-lost; mark paid; join requests
  (exists).
- **Admin:** users, taxonomy, promo code CRUD, audit log, force-archive,
  reassign, enterprise activation.
- **Screen registry:** `e2e/screens.ts` lists every `page.tsx` route with
  the states to cover. A rules test (T9) fails when a page is missing from
  it.
- **CI:** shard the e2e job (`--shard`) when it passes ~15 minutes, with a
  final "every shard passed" job, as in autofind `e2e.yml`.

### T7 — Accessibility + visual on every screen (M) · after SEO merges

Extends SEO W5.5/W5.7 from 6 screens to all of them.

- Every entry in `e2e/screens.ts` gets axe (WCAG 2.2 AA, same helper) and a
  `toHaveScreenshot` baseline at 375 and 1440, plus dark if the UI has it
  (autofind's `IMPLEMENTED_THEMES` guard).
- States: empty, filled, validation error and server error. Live regions
  are masked.
- Keyboard-only flows for sign-in, apply, job composer and checkout.
- Linux baselines via SEO's Docker command, and "missing baseline fails"
  (`updateSnapshots: 'none'`).

### T8 — Security in the browser (S) · after SEO + Phase C

- **Real cookies:** cookie flags and response headers (CSP, HSTS,
  `X-Content-Type-Options`, frame options) on a production build.
- **`returnTo` open redirect:** `returnTo=https://evil.example` and
  `//evil.example` land on a safe default.
- **URL tampering in the UI:** employer A opens B's
  `/employer/jobs/<id>/applications` or edit page → 404. A candidate opens
  another candidate's resume download → 404.
- **Cross-site POST** to a BFF auth route: rejected or harmless. Check what
  `SameSite` gives today, and write `it.fails` if it isn't enough.
- **Revoked sessions:** password reset in context 1 → context 2 is signed
  out (Phase C's spec; extend it to "sign out everywhere").

### T9 — The gates prove themselves (M) · after SEO merges

1. **`scripts/rules.test.ts`** (part of `pnpm test`). It checks that:
   - every project with source has a `test` target, and those with DB/Redis
     code have `test:integration`;
   - no `*.int.test.ts` is picked up by a unit config;
   - every vitest config uses the presets;
   - e2e shards cover every test exactly once;
   - every `page.tsx` is in `e2e/screens.ts`;
   - every BFF route maps to a Nest route.
2. **`pnpm test:harness`:** run the real commands against deliberate faults
   and require them to fail:
   - an unclassified route and an unguarded role route;
   - a missing isolation check;
   - an edited merged migration;
   - a hard-coded JSX string;
   - an axe violation (`E2E_FAULT=axe-violation`);
   - a 1px nudge;
   - a missing baseline.
3. **`scripts/check-changed.mjs`** (port from autofind, with its own test),
   called by `.husky/pre-push` in place of SEO's static list:
   - docs only → nothing;
   - api / database / worker → + `test:integration`;
   - web → + e2e;
   - lockfile / config → everything.
4. **CI and budget.** Edit `ci.yml` according to Decision 2. Add a
   first-load JS budget for the Next build (warn-only, `continue-on-error`,
   from the first measured value).

### T10 — Ops smoke (S, optional) · after Phase C

- **`stack:smoke`:** build the three `linux/amd64` images locally (never on
  the VM), boot them with compose, and hit `/api/health/ready`, the home page
  and one job page.
- **Backup restore drill** for Phase C's `backup-postgres.sh`: restore into
  a scratch database, then count rows. Runs by hand or monthly; never on PRs.

## Order of work

1. T1 harness → T3 database → T2 API (non-auth controllers first) → T4
   worker → T5 unit/coverage. All of this can start now.
2. After Phase C merges: the auth/session parts of T2, the dead-letter and
   shutdown parts of T4, and T10.
3. After SEO merges: T6 → T7 → T8 → T9.
4. Docs: a `docs/TESTING.md` for hireforge (layers, commands, registries,
   where each runs). Add a `PROGRESS.md` section and the `NEEDS_STEFAN.md`
   items.

## Done means

- From the repo root, all green: `pnpm lint && pnpm format && pnpm typecheck
&& pnpm test && pnpm test:integration && pnpm build && pnpm e2e`.
  Integration runs in CI per Decision 2.
- **Registries are complete:** every Nest route, BFF route, page and
  isolation resource is registered, and the rules test fails on a new
  unregistered one (shown failing once).
- **Coverage:** thresholds enforced on the dense libraries;
  `apps/api`, `apps/worker` and `libs/database` have integration suites.
- **Scale check:** about **≥ 1 000 unit + integration cases** and
  **≥ 250 e2e cases** across the 375/1440 projects, with baselines for every
  screen. This is a sanity check, not the goal.
- `test:harness` proves each gate goes red on its fault.
- Every known bug found has an `it.fails` test plus a `PROGRESS.md` entry.
  Every new test was shown failing without its fix (noted in the log).
- The work sits uncommitted in the clone. The log lists suggested commits in
  order, each with its files and the check that was green. **No commit,
  push, PR, merge or deploy from this branch**; Stefan does those. After
  Stefan deploys, he checks headers (T8/T9) and the smoke test (T10) on
  https://sljakam.com.

## Needs Stefan

These go into `NEEDS_STEFAN.md` when implementation starts.

- Confirm Decisions 1–2. Should the existing PR e2e job move to
  `main`-only?
- Docker is required for `pnpm test:integration` locally (OrbStack is
  fine).
- How deploys are triggered today (by hand from the Mac). Should the deploy
  script refuse to ship when `main`'s integration/e2e run is red?
  `TODO(Stefan)`.
- Any real bug the matrices find that needs a product decision (for
  example, what a moderator outside the pipeline may see).

## Implementation log

Ticked as each step lands **in the working tree** (uncommitted). Each entry
lists its files, the root check result, a suggested commit message, and for
each new test "shown failing: <how>". Skipped items say why.

**Session 1 (2026-10-28, Claude, unattended).** Upstream at start:
`origin/main` = `a7adef7`; Phase C (`fix/phase-c-hardening`, pushed but
unmerged) and SEO (`feat/seo-quality-gates`, local) are **not** on `main`,
so T6–T10 and the Phase C parts of T2/T4 are blocked. Decisions (Stefan,
2026-10-28, in the session prompt): **1 = A (Testcontainers)**, **2 = A
(integration on `main` + manual only; the existing PR e2e job stays)**.

- [x] T1 harness
  - **Files:** `libs/testing/**` (new project `testing`: presets
    `unitConfig()` / `integrationConfig()`, Testcontainers global setup,
    per-file database from a migrated + seeded template, per-worker Redis DB,
    raw-SQL factories, `COMPANY_A`/`COMPANY_B`, `testId`, `useFixedClock`,
    stubs: Resend (same dedupe as `e2e/support/fake-resend.mjs`), NBS page,
    fake Sanity client, `explain()`/`usesIndex()`); `apps/api/src/__harness__/`
    (`startApp`, `signIn` through the real login routes, `signInAs(role)`,
    `seedNbsRate`); `apps/api/src/app/configure-app.ts` + `main.ts` (shared
    interceptor/filter/prefix, no behaviour change);
    `vitest.integration.config.mts` + `test:integration` target in api,
    worker, database, server-billing, testing; root `pnpm test:integration`;
    `.github/workflows/integration.yml` (push to `main` + manual, 30 min);
    every lib/web unit `vitest.config.mts` now uses `unitConfig()` (same
    settings + excludes `*.int.test.ts`); `implicitDependencies: ["!testing"]`
    on every consumer project (else Nx esbuild compiles `libs/testing` into
    `dist/apps/worker`); `tsconfig.base.json` paths `testing*`;
    `eslint.config.mjs` ignores `vitest.*.config.mts` for type-aware lint;
    devDeps `testcontainers`, `@testcontainers/{postgresql,redis}`,
    `supertest`, `@types/supertest`, `unplugin-swc`, `@vitest/coverage-v8`.
  - `billing-numbering.concurrency.integration.test.ts` →
    `billing-numbering.int.test.ts`, always on (50 parallel transactions,
    gap-free, rollback returns the number, per kind/year, year range).
  - **Shown failing:** parallel-runs test with a fixed host port for the
    probe's Postgres → "port is already allocated"; numbering test with the
    UPSERT replaced by read-then-write → duplicate numbers.
  - **Check:** lint ✅ format ✅ typecheck ✅ test ✅ build ✅
    test:integration ✅ (5 projects, ~21 s). Local note: `pnpm build` needs a
    `.env` file (CI `touch .env`s it); an empty gitignored one was created.
  - **After SEO merges:** its `apps/{api,worker}/vitest.config.mts` and
    `libs/database/vitest.config.mts` include `src/**/*.test.ts`, which also
    matches `*.int.test.ts`. Switch them to `unitConfig(import.meta.url)`
    (the T9 rules test will catch it).
  - **Suggested commit 1:** `refactor(api): share app configuration between main and tests`
    — `apps/api/src/app/configure-app.ts`, `apps/api/src/main.ts`.
  - **Suggested commit 2:** `test: add libs/testing integration harness (Testcontainers)`
    — everything else above.
- [x] T3 database
  - Done: `libs/database/src/migrations.int.test.ts` (journal ↔ files, idx,
    strictly increasing `when`; real migrate from empty on its own container;
    second run no-op; seeds load; dev seed refuses production;
    `it.fails` drizzle/meta snapshot drift), `schema-drift.int.test.ts`
    (schema.ts ↔ migrated DB both ways: tables, every column's type /
    nullability / default, indexes incl. partial, CHECKs, FKs + ON DELETE;
    allowlisted: `jobs_fts_published_idx`, `candidates.city_id` FK),
    `constraints.int.test.ts` (one live invoice, numbers, sequences,
    restrict deletes, VAT check, promo checks, auth token unique / purpose /
    expiry / cascade, slugs, PIB/MB, one active application, one primary CV,
    CV in use, one pending join request, FK behaviour; `it.fails` audit rows
    vanish with their staff user).
  - **Shown failing:** drift test with `users.public_phone` made NOT NULL and
    an extra index in schema.ts → 2 failures; constraints with
    `invoices_subscription_live_unique`, `resume_assets_candidate_primary_unique`
    and `promo_codes_value_range_check` dropped → 4 failures.
  - Races and EXPLAIN run through the API, since they need the services' real
    SQL: `apps/api/src/races.int.test.ts` (5 rounds each: two moderators
    publish one job; moderator + admin mark one proforma paid; two staff
    decide one join request; once-per-company promo from two employers; last
    redemption from three companies; double-click Apply; two sign-ups of the
    same new company) and `apps/api/src/query-plans.int.test.ts` (captures
    the SQL the endpoint really sends from the pg driver, EXPLAINs it with
    `enable_seqscan = off`: FTS index `it.fails` (Known issue), public list
    never seq-scans jobs, employer list uses `jobs_company_id_idx`, outbox
    poll walks `outbox_pkey`).
  - **Shown failing:** plans with `jobs_company_id_idx` dropped → 1 red;
    double-click Apply was red **before the fix** (201 + 500, see fix below).
  - **Check:** all green (see T2 check).
  - **Suggested commit 3:** `test(database): migrations from empty, schema ↔ DB drift, constraints`
    — `libs/database/src/{migrations,schema-drift,constraints}.int.test.ts`.
- [x] T2 API registries, matrix, isolation, flows (all but the Phase C auth parts)
  - Done: `apps/api/src/route-registry.int.test.ts` (100 routes in
    PUBLIC / SESSION / roles / token buckets; served routes == registry;
    guard decorators == registry; 5 callers × 100 routes = 500 generated
    cases, each also "never 5xx" on garbage input), `__harness__/isolation.ts`
    (`describeIsolation`), `company-isolation.int.test.ts` (employer jobs,
    proformas, workspace, purchase with forged companyId, image upload,
    applicants; candidate applications, CVs, saved jobs, profile, foreign CV;
    moderator pipeline company, join requests, pending payments; forged ids
    in query / header / body; positive controls).
  - **Shown failing:** registry/matrix with `RolesGuard` removed from
    `EmployerController` and an extra `GET employer/debug-export` → registry,
    guard check and 18 matrix cases red; isolation with the company check of
    `updateDraftJob` disabled → 2 red.
  - **Found:** (1) `PATCH /api/moderator/employers/:id` moves any employer
    into any company, no pipeline scoping (`it.fails`, NEEDS_STEFAN);
    (2) employer job routes answer 403 `JOB_FORBIDDEN_COMPANY` for another
    company's job instead of 404 (`it.fails`, minor); (3) `GET /api/integration`
    is public and enqueues a BullMQ job + calls Sanity (registry note).
  - Flows (T2.4/T2.5), one file per area, each asserting DB state, outbox
    events and contract schemas where `libs/contracts` has one:
    `job-lifecycle` (draft → submit → publish / reject / publish-directly /
    unpublish / force-archive / expire + expiring-soon once; capacity cap;
    publish needs an active subscription; admin direct publish needs GAZDA;
    two subscriptions need an explicit choice), `billing-flow` (unverified
    can't buy; purchase → numbered proforma + PDF download; GAZDA not sold;
    mark paid → active + one invoice with the NBS rate + audited reference;
    twice → one invoice; admin cancel with reason; enterprise activation +
    job cap; every promo rule incl. currency, cap, window, package, limit;
    `full_free` `it.fails`), `applications-flow` (verify-first, CV upload /
    download / delete rules, apply, duplicate, draft / external / unknown
    job, cooldown, saved jobs / searches, profile), `auth-flow` (register,
    per-role sign-in doors, refresh, forged token, verify + reset links
    single-use / expiring / hashed / newest-only, same answer for unknown
    email, company sign-up by PIB / MB / name → join request → approve /
    reject, rate limits per IP / per email on real Redis), `staff-admin-flow`
    (lead create, pickup, close-won / lost, verify, views, composer
    bootstrap, reassign + history, user roles, taxonomy CRUD, promo CRUD,
    audit), `public-jobs` (only published visible, filters, FTS, Cyrillic /
    diacritics `it.fails`, clicks, image upload type / size / dimensions,
    AVIF), `other-controllers` (CMS sync webhook, integration, employers
    directory, staff employer moves, moderator authoring, patch-publish),
    `security` (production boot guard on the **built** `dist/apps/api/main.js`:
    refuses missing / placeholder secret and dev headers, boots and is ready
    with a real config; dev headers off in production; expired / refresh /
    `alg:none` / foreign-secret tokens; malformed JSON).
  - **Shown failing (flows):** promo currency check disabled → 2 red;
    `usedAt` check removed from `consumeAuthToken` → 3 red; candidate email
    verification check disabled → 1 red.
  - **More found:** (4) double-click Apply → 500 (**fixed**, below);
    (5) two simultaneous sign-ups of the same new company → 500 for the
    second (`it.fails`); (6) employers never see the cover letter
    (`it.fails`, NEEDS_STEFAN); (7) job-description images of drafts are
    public (`it.fails`, NEEDS_STEFAN); (8) uploaded CV names lose Serbian
    letters (`Petrović` → `Petrovi__`, `it.fails`); (9) a JSON body over the
    limit → 500 instead of 413 (`it.fails`); (10) contracts'
    `applicationResponseSchema` is unused (`POST /candidate/applications`
    answers `{ id }`).
  - **Fix in the tree:** `apps/api/src/candidate/candidate.service.ts` maps
    the `applications_candidate_job_active_unique` violation to 409
    `APPLICATION_ALREADY_EXISTS` (28 lines incl. helper and comment; logic
    ~12). Shown failing without it: `races.int.test.ts` double-click → `201,500`.
  - `apps/api` `test:integration` now `dependsOn: ["build"]` (the boot-guard
    test runs the built server).
  - **Check (2026-10-28, from the root):** lint ✅ format ✅ typecheck ✅
    test ✅ build ✅ test:integration ✅ — api 773, database 75, billing 4,
    testing 5, worker 1 (858 integration cases, ~55 s).
  - **Suggested commit 4 (dropped after Phase D #9, which has its own fix):** `fix(api): answer 409, not 500, when Apply is double-clicked`
    — `apps/api/src/candidate/candidate.service.ts`.
  - **Suggested commit 5:** `test(api): route registry, role matrix, company isolation, flows, races, plans`
    — `apps/api/src/**/*.int.test.ts`, `apps/api/src/__harness__/isolation.ts`,
    `apps/api/project.json`, `libs/testing/src/api/index.ts`.
- [x] T4 worker (all but the Phase C dead-after-N / SIGTERM parts)
  - **Files:** `apps/worker/src/outbox.int.test.ts` (poll: one job per event,
    stable id, oldest first, batch, correlation id, skips processed;
    dispatch: claim once, three concurrent claims → one, handler failure
    rolls the claim back, unknown id no-op, listing touch; dead letters:
    not with retries left, once at the last attempt with a snapshot,
    unrecoverable at once, other job kinds never),
    `notification-email.int.test.ts` (each of the 5 job notifications to
    every employer with title + link + per-recipient idempotency key; reason;
    Belgrade date; `en` vs `sr`; same event twice → one stored; deleted job
    → nothing; Resend 500 → throws for retry; join request approved /
    rejected / pending; billing mails sr / en / other events),
    `worker-process.int.test.ts` (**the built `dist/apps/worker/main.js`**:
    `worker_started` + scheduler flags; outbox event → one email per
    employer + processed; scheduled tick expires a job and mails it, ends
    a subscription; real BullMQ: 3 attempts with growing delays → one dead
    letter; same job id twice → processed once; shipped options 5 attempts
    exponential), `schedulers.int.test.ts` (subscription expiry; NBS refresh
    from the stub, 24 h cache, NBS down keeps the last rate, warm cache never
    calls NBS, missing EUR row → parse error; CMS reconcile through
    `fakeSanityClient` → mirror + audit; malformed docs rejected).
    `apps/worker` `test:integration` now `dependsOn: ["build"]`.
  - **Shown failing:** idempotency key removed → 6 red; outbox claim without
    `processed_at IS NULL` → 2 red; every failure treated as terminal → 1 red;
    proforma email typo test red before the copy fix.
  - **Fix in the tree:** `apps/worker/src/billing-email-dispatch.ts` "Profaktura
    je izadata" → "izdata" (typo in the Serbian proforma email, 2 lines).
  - **Found (NEEDS_STEFAN):** billing mails go to one arbitrary employer of
    the company (`limit 1`, no order), not to the company's `billing_email`;
    billing mail failures are swallowed (no retry, no idempotency key); the
    worker has no production env guard, so a missing `RESEND_API_KEY` means
    every notification is silently "skipped"; the NBS page URL is hard-coded
    (tests use the library's `sourceUrl`).
  - **Check:** worker 44 ✅ (full root check under T5).
  - **Suggested commit 6:** `fix(worker): Serbian proforma email says "izdata"`
    — `apps/worker/src/billing-email-dispatch.ts`.
  - **Suggested commit 7:** `test(worker): outbox, notifications, schedulers and the built worker on real Postgres/Redis`
    — `apps/worker/src/*.int.test.ts`, `apps/worker/project.json`.
- [x] T5 unit depth + coverage thresholds (job composer component test skipped, see below)
  - **Gate:** `unitConfig(url, { coverage: [files] })` turns on v8 coverage
    with **90 % lines and branches per file**, enforced by `pnpm test` (exit 1
    below it). Gated: contracts (billing, cv-profile, packages,
    promo-checkout-math, promo-codes, prose-plain, public-jobs,
    subscriptions), server-jobs (entitlements-draft, external-apply-url,
    job-description-html, job-slug, job-trivial-patch), server-billing
    (nbs-middle-rate), server-email (all three files), server-pdf
    (billing-form-document), server-cms-sync (map-sanity-package),
    server-applications, server-auth, shared (api-client, correlation,
    sanity, structured-log, transliteration, bullmq/job-logging).
  - **New suites:** `libs/server/jobs` (`job-description-html.xss.test.ts`: 19
    XSS vectors + allowed formatting + TipTap docs; `job-slug-ascii.test.ts`;
    `external-apply-url.test.ts`; `job-trivial-patch.test.ts`;
    `entitlements-draft.rules.test.ts`), `libs/contracts/src/lib/dense-logic.test.ts`,
    `libs/server/billing/src/lib/nbs-cache.test.ts` (stub page + in-memory
    cache; `fetch` spied for the default URL), `libs/shared/src/lib/shared-depth.test.ts`,
    `libs/server/email/src/lib/all-templates.test.ts` (every template sr + en,
    no `undefined` / empty / raw `${`, HTML escaped), `libs/server/pdf`
    (new unit config; PDF **text** of proforma / invoice: number, buyer with
    Serbian letters, amounts, wire, refund, TEST watermark),
    `libs/server/cv-templates/src/lib/cv-pdf-text.spec.tsx` (all 3 templates),
    `libs/server/cms-sync` (new unit config; mapper + 19 refusals),
    `libs/server/employers` (new unit + integration configs; new-company
    values; legal-name normalisation; `company-match.int.test.ts`: the six
    SSOT §5.4 match rules and their priority on real Postgres, incl. A vs B
    look-alikes), `apps/api/src/search-golden.int.test.ts` (11 golden
    queries; 4 folding `it.fails`).
  - **apps/web non-UI:** `middleware/session-refresh.test.ts` (all three
    roles: refresh only on own pages and when expiring; new cookies
    HttpOnly, SameSite=Lax, path /, Secure in production; refusals set
    nothing), `lib/bff-helpers.test.ts` (Nest URL, origin resolution, the
    POST proxy forwards body / IP / token, **never the browser cookie**,
    relays status), `apps/api/src/bff-parity.int.test.ts` (all 80 BFF
    `route.ts` → registry; 5 allowlisted with reasons),
    `hooks/mutations/login-return-to.test.tsx` (sign-in goes back only to a
    site path; locale stripped).
  - **Components** (Testing Library, jsdom per file, `src/test/render.tsx`
    with `sr.json`): apply form, package checkout + promo, CV wizard.
    **Skipped:** job composer (TipTap/ProseMirror in jsdom is unreliable; its
    rules are covered by `entitlements-draft.rules.test.ts` and the API
    flows; belongs to T6 in the browser).
  - **devDeps added in T5:** `unpdf` (PDF text), `@testing-library/react`,
    `@testing-library/user-event`, `@testing-library/jest-dom`.
    `testing/pdf` path in `tsconfig.base.json`; `testing` path in
    `apps/web/tsconfig.json`; `@vitejs/plugin-react` in the web unit config.
  - **Shown failing:** coverage gate with `shared-depth.test.ts` removed →
    exit 1 (`api-client.ts` 0 %); while writing, the gate failed
    `cv-profile.ts` (81 % branches), `nbs-middle-rate.ts` (81 %) and
    `billing-form-document.tsx` (89 %) until the missing cases were added;
    sanitizer allowing `onclick` → 1 red; company matching without the PIB
    rule → 2 red; BFF parity with `POST /api/moderator/jobs/:id/publish`
    removed from the registry → red; login hooks of `a7adef7`
    (`startsWith('/')` only) → 4 red.
  - **Found:** CV wizard row labels (employer, title, institution, degree,
    skill) aren't tied to their inputs (`it.fails`); `returnTo="/\host"`
    passes the sign-in check (`it.fails`, not exploitable while
    `localePrefix` is `always`); job images may load from any https host
    (tracking pixels; NEEDS_STEFAN question).
  - **Upstream overlap:** `main` (Phase C/SEO) already has the `đ → dj` slug
    fix and refuses `//` in `returnTo`. I had made the same two fixes here;
    the tree now holds main's exact versions of `job-slug.ts` and both login
    hooks, so they are **not** suggested commits of Phase T.
  - **Check (from the root, 2026-10-28):** lint ✅ format ✅ typecheck ✅
    test ✅ (13 projects, 452 unit cases, 9 coverage gates) build ✅
    test:integration ✅ (6 projects, 1004 cases, ~76 s).
  - **Suggested commit 8:** `test: coverage gate on dense logic, PDF text, email templates, Sanity mapping, company matching`
    — `libs/testing/src/vitest/preset.ts`, `libs/testing/src/pdf.ts`, every
    lib `vitest.config.mts` with `coverage`, the new lib tests above,
    `libs/server/employers/{vitest.config.mts,vitest.integration.config.mts,project.json}`,
    `libs/server/{pdf,cms-sync}/vitest.config.mts`, `apps/api/src/search-golden.int.test.ts`,
    `package.json`, `pnpm-lock.yaml`, `tsconfig.base.json`.
  - **Suggested commit 9:** `test(web): refresh middleware, BFF proxy and parity, sign-in redirect, component tests`
    — `apps/web/vitest.config.mts`, `apps/web/tsconfig.json`,
    `apps/web/src/test/render.tsx`, the web tests above,
    `apps/api/src/bff-parity.int.test.ts`, `apps/api/src/__harness__/routes.ts`.
- [ ] T2/T4 Phase C parts — **unblocked upstream, not started** (see "Stopped
      here" below)
- [ ] T6 e2e behaviour per role — unblocked upstream, not started
- [ ] T7 a11y + visual on every screen — unblocked upstream, not started
- [ ] T8 browser security — unblocked upstream, not started
- [ ] T9 gate self-tests + `check:changed` — unblocked upstream, not started
- [ ] T10 ops smoke (optional) — unblocked upstream, not started
- [x] `docs/TESTING.md` (new). `PROGRESS.md` / `NEEDS_STEFAN.md`: **text below,
      not applied** — `main` restructured both files, so editing them on
      `a7adef7` would only add merge conflicts. Paste after the update.

### Stopped here (2026-10-28, end of session 1)

While T5 ran, **Phase C (#4) and SEO (#7) merged** (`origin/main` = `0d41284`).
That unlocks the Phase C parts of T2/T4 and T6–T10, but they need `main` in
this tree first. The prompt's update command (`git stash && git merge
--ff-only origin/main && git stash pop`) was **refused by the session's
permission check** ("irreversible local destruction"), so nothing was
updated: HEAD is still `a7adef7`, no stash exists, and the working tree is
intact. A read-only dry run (`git stash create` + `git merge-tree`) shows the
update now conflicts in **only `package.json` and `pnpm-lock.yaml`**.

**Later on 2026-10-28:** `main` moved again to `011c959` (Phase D #9 merged;
migrations up to `0033`). Re-run the read-only dry run
(`git merge-tree --write-tree --merge-base=a7adef7 origin/main $(git stash create)`)
before updating; `schema-drift.int.test.ts` and `migrations.int.test.ts` will
check the new migrations automatically.

**Update steps for Stefan** (or allow them for the next session):

1. `rm docs/plans/SEO_AND_QUALITY_GATES.md` — the untracked snapshot; `main`
   has the newer, longer version, and the fast-forward refuses to overwrite it.
2. `git fetch origin && git stash && git merge --ff-only origin/main && git stash pop`
3. Conflicts:
   - `pnpm-lock.yaml`: take main's —
     `git show origin/main:pnpm-lock.yaml > pnpm-lock.yaml`.
   - `package.json`: keep main's file, then add back the `test:integration`
     script (`nx run-many -t test:integration --all --parallel=2 --outputStyle=stream`).
   - `apps/api/src/candidate/candidate.service.ts` and
     `libs/server/jobs/src/lib/job-slug.ts`: take **main's** versions
     (`git show origin/main:<path> > <path>`). Phase D (#9) fixed the
     double-Apply race itself (`isUniqueViolation`) and added Cyrillic → Latin
     slugs, so **suggested commit 4 is dropped**; `races.int.test.ts`
     (double-click Apply) then checks Phase D's fix.
   - then `pnpm add -Dw @testcontainers/postgresql@^12.2.1 @testcontainers/redis@^12.2.1 testcontainers@^12.2.1 supertest@^7.3.1 @types/supertest unplugin-swc@^2.0.0 @vitest/coverage-v8@4.0.18 unpdf@^1.9.1 @testing-library/react@^16.3.3 @testing-library/user-event@^14.6.8 @testing-library/jest-dom@^6.9.1`
4. Replace SEO's unit configs, which would otherwise run every
   `*.int.test.ts` inside `pnpm test` without Docker:
   - `apps/api/vitest.config.mts`, `apps/worker/vitest.config.mts`:
     `import { unitConfig } from '../../libs/testing/src/vitest/preset';`
     `export default unitConfig(import.meta.url, { extra: { test: { passWithNoTests: true } } });`
   - `libs/database/vitest.config.mts`: `import { unitConfig } from '../testing/src/vitest/preset';`
     `export default unitConfig(import.meta.url);`
5. `git diff origin/main -- libs/server/jobs/src/lib/job-slug.ts apps/web/src/hooks/mutations`
   should be empty (main's versions).
6. Full check from the root, then commits 1–9 in order.

**Then (session 2):** T2/T4 Phase C parts (refresh revocation via
`token_version`, outbox dead-after-N + partial index in the plans test,
SIGTERM), T6 → T7 → T8 → T9 (incl. `scripts/rules.test.ts` with "every
consumer project has `implicitDependencies: ["!testing"]`" and "no unit
config includes `*.int.test.ts`"), T10.

### Session 2 (2026-10-28): rebased on `main@2a5fe0a`, shipped

Stefan asked to rebase, commit, merge and deploy (this lifts the "no
commits" rule for this step only).

- Rebased onto `main@2a5fe0a` (Phase C/D, SEO #7/#13, bundler module
  resolution #12). Took `main`'s `candidate.service.ts` and `job-slug.ts`
  (suggested commit 4 dropped); `package.json` keeps `main`'s `test` (now
  covers api and worker) plus `test:integration`; lockfile regenerated.
- `apps/api`, `apps/worker`, `libs/database` unit configs use
  `unitConfig` (they picked up `*.int.test.ts` otherwise).
- Phase D fixed what three `it.fails` pinned; flipped to `it`: search
  folding (`search-golden`, `public-jobs`), the FTS index (`query-plans`,
  now seeded with 200 live jobs + `ANALYZE` so the planner has a real
  choice; shown failing by matching the query to the pre-0033 index).
- Followed `main`: `GET /api/public/jobs/sitemap` (public),
  `GET /api/public/employers` (public while `PUBLIC_JOBS`), the outbox
  poll reads `outbox_events_unprocessed_idx` (0031), expired jobs keep
  their page (`live: false`, not listed), `indexnow-key` route needs no Nest.
- Phase D's Cyrillic slugs left one branch uncovered (a Cyrillic letter
  Serbian doesn't have); new case in `job-slug-ascii.test.ts` (gate failed at
  88.9 % before it).
- The PROGRESS / NEEDS texts below are now in `PROGRESS.md` and
  `NEEDS_STEFAN.md`, without the search items Phase D fixed.

### Text for `PROGRESS.md` (paste into "Known issues not yet scheduled")

Each has an `it.fails` test named after the fix; fixing the bug turns it red
and it is flipped to `it`.

- Moderators can move any employer into any company
  (`PATCH /api/moderator/employers/:id` has no pipeline check)
  — `company-isolation.int.test.ts`. Needs a product decision (NEEDS_STEFAN).
- Employer job routes answer 403 `JOB_FORBIDDEN_COMPANY` for another
  company's job (confirms the id exists) instead of 404.
- Two simultaneous sign-ups of the same new company → 500 for the second
  (unique PIB) instead of a join request — `races.int.test.ts`.
- Cover letters are stored but no route shows them to the employer.
- Job-description images of drafts / rejected / archived jobs are public to
  anyone with the URL (`getPublicFile` has no status check).
- Uploaded CV file names lose Serbian letters (`Petrović` → `Petrovi__`:
  multer reads names as latin1, `safeBasename` keeps ASCII only).
- A JSON body over the size limit → 500 (and a crash log) instead of 413.
- `staff_audit_log.actor_user_id` is ON DELETE CASCADE: deleting a staff user
  erases their audit trail.
- `full_free` promo codes don't activate the plan (unchanged).
- Search: FTS index unused; no diacritic / `đ`→`dj` / Cyrillic folding; no
  word forms (`search-golden.int.test.ts`, `query-plans.int.test.ts`).
- `drizzle/meta` has only the 0000 snapshot (`migrations.int.test.ts`).
- CV wizard: experience / education / skill row labels aren't tied to their
  inputs (screen readers).
- Sign-in `returnTo` refuses `//host` but not `/\host` (safe while
  `localePrefix: 'always'`).
- Contracts' `applicationResponseSchema` is unused (`POST
/candidate/applications` answers `{ id }`).

### Text for `NEEDS_STEFAN.md` (product decisions found by Phase T)

- **Moderator scope for employer accounts:** should a moderator be able to
  move an employer into a company outside their pipeline (today: yes, any)?
  Same question for `GET /moderator/employers` (lists every employer) and
  `POST /moderator/jobs` / the job composer bootstrap (any company).
- **Cover letters:** should employers see the candidate's cover letter? It is
  collected and stored but never shown.
- **Draft images:** may images of unpublished jobs be fetched by URL? If not,
  `getPublicFile` needs a status check (and the editor preview must load
  drafts' images through an authenticated route).
- **Billing emails:** they go to one arbitrary employer of the company, not
  to the company's `billing_email`; failures are not retried. Intended?
- **Worker in production without `RESEND_API_KEY`:** every notification is
  silently "skipped". Should the worker refuse to start, like the API's
  production guard?
- **`GET /api/integration` is public** and enqueues a BullMQ job + pings
  Sanity on every call. Keep it public, put it behind a token, or remove it?
- **External images in job descriptions** (any https host) allow tracking
  pixels. Restrict to uploaded media?
- **Docker** is needed for `pnpm test:integration` (OrbStack is fine).
