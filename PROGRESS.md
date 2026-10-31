# Šljakam — progress & launch backlog

Living status file. **Trust this over the `Status:` lines in
[`docs/refactor/MIGRATION_PLAN.md`](./docs/refactor/MIGRATION_PLAN.md)**,
which went stale during the Cursor phase (Steps 4, 5, 14, 15 say "pending"
but shipped). Update this file in the same PR as the work.

Last updated: 2026-10-31 (staff-created employer accounts; candidate
display name refresh). Open items for Stefan:
[`NEEDS_STEFAN.md`](./NEEDS_STEFAN.md).

## Current state

- **Prod:** `sljakam.com` on one Hetzner VM (Docker Compose + Caddy, see
  [`docs/deployment/hetzner.md`](./docs/deployment/hetzner.md)). No real
  users yet. **Never build images on the VM** (3.8 GB — it took the site
  down for ~18 min on 2026-10-28; 4 GB swap since 2026-10-29). **Deploys
  (autofind-style, 2026-10-29):** a merge to `main` → `deploy-staging`
  workflow (CI + integration, images built once on the runner) →
  staging; production = manual `deploy-production` workflow with Stefan's
  approval, same images. Both run `scripts/deploy/ship.sh` (also usable
  from a Mac): backup, migrate, health gates with automatic rollback,
  images of each environment's last 3 releases kept
  (`/opt/hireforge/backups/releases*.log`), one release at a time (lock);
  rollback `scripts/deploy/release.sh <sha> [staging]` on the server. The
  workflows wait on the CI deploy key (NEEDS_STEFAN item 1). Since 2026-10-29 the
  images are ~0.7–0.9 GB on the VM (were ~4.5 GB; the disk had reached 90%,
  now ~13%). First ship.sh deploy: `main@d2d1d76` (#23 + #24), attempt 1,
  all gates green, seo:audit and Lighthouse clean. `main@d1a49c1` (#27) was
  rolled back automatically by a gate bug (unchanged worker image; fixed in
  #29); `main@ee02722` (#27–#29) live 2026-10-29 01:24 UTC.
- **Backups:** nightly + per deploy, on the VM and in the bucket
  `hireforge` (DEVLEGION, nbg1; `backups/postgres/{production,staging}/`,
  30 days); restore from the bucket checked on prod 2026-10-29.
- **Staging:** https://staging.sljakam.com (open, `noindex`) on the same VM,
  own checkout `/opt/hireforge-staging`, `compose.staging.yml`, memory caps
  (~310 MB in use). Seed accounts = production's, with production's
  password hashes; shares the Sanity read token, the bucket and the Resend
  key, the latter only with `EMAIL_REDIRECT_TO` (every staging email to
  Stefan's inbox). `docs/deployment/hetzner.md` §10.
- **Checks:** `pnpm lint && pnpm format && pnpm typecheck && pnpm test &&
pnpm build` (+ `pnpm check:i18n`) = `pnpm verify`; PRs run it locally, CI on
  `main`. Husky: pre-commit lint-staged, pre-push `pnpm verify` (blocking) + design and
  contrast reports (warn-only). `pnpm test` covers api and worker and the
  merged-migration guard, plus a 90 % coverage gate on dense logic.
- **Integration:** `pnpm test:integration` (Docker; real Postgres + Redis
  through Testcontainers, ~75 s): route registry + role matrix, company
  isolation, flows, races, query plans, schema drift, the built worker.
  On `main` it gates the staging deploy (`deploy-staging` calls
  `integration.yml`), not on PRs. How to
  test: [`docs/TESTING.md`](./docs/TESTING.md).
- **Warn-only reports:** `pnpm check:design`, `pnpm check:contrast`,
  `pnpm e2e:visual`, `pnpm lighthouse <url>`, `pnpm seo:audit <url>`;
  on CI in `quality-report.yml` (push to main / dispatch, never PRs).
- **E2E:** `pnpm e2e` (Playwright) recreates an isolated `<db>_e2e`
  database + Redis DB 15, builds API + worker, starts a fake Resend
  (`e2e/support/fake-resend.mjs`) and the worker, and serves web with
  `next dev` (local) or a production build with `E2E_WEB=start` (CI).
  Tests that need email read it from the fake (`e2e/support/mail.ts`).
- **Sanity Studio** (2026-10-31, `fix/cms-studio-env`): the hosted Studio
  crashed with "Missing Sanity Studio project id". `apps/cms/env.ts` read
  the variables with a computed `process.env[key]`, which the Studio build
  turns into `{}[key]`; it now reads `SANITY_STUDIO_PROJECT_ID` /
  `SANITY_STUDIO_DATASET` by name (no `NEXT_PUBLIC_*` fallback: the browser
  bundle never gets those). A stray `apps/cms/node_modules` (a
  `pnpm install` run inside `apps/cms` on 2026-10-29, second React) made the
  build crash too; it was moved aside on this Mac. Deploy command:
  `docs/deployment/hetzner.md` §6. Redeploy needs Stefan's OK.
- **Next: CV templates, three to five** (planned 2026-10-31; Stefan agreed
  with every recommendation). Plan and decisions:
  [`docs/plans/CV_TEMPLATES.md`](./docs/plans/CV_TEMPLATES.md), sketches:
  https://claude.ai/artifact/T5ESPQYedJpRgqxPTyXvtR. Six PRs: foundation
  (Serbian CV text, email, bundled font) → new profile fields → restyle the
  three → add Evropski and Praktičan → photo and accent (after the storage
  work) → picker and Sanity copy.
  - **PR 1 done** (`fix/cv-pdf-foundation`): CVs use the builder's
    language (titles, "mar 2019.", "danas") and show the account email;
    Noto Sans ships in the repo (`libs/server/pdf/src/fonts`, copied into
    the API bundle and `apps/web/public/fonts/pdf`, a test keeps the copies
    equal); hyphenation is off (emails were split). Found and fixed: after
    one PDF with bold "Š"/"ć", the next PDF in the same process lost bold
    "S"/"c" from its text layer (scanners read "Experiene"); every server
    render now reloads the font (`renderPdfToBuffer`, invoices too).
    Templates split into `templates/*` with a `registry`. First e2e
    through the builder: `e2e/cv-builder.spec.ts`.
  - **PR 2 done** (`feat/cv-profile-fields`): the profile (jsonb, no
    migration) gains summary "O meni", languages (CEFR or native), driving
    licence categories, certificates, https links, digital skills,
    availability and a "show email" switch; old profiles parse with
    defaults. The builder has a 7th step "Jezici, dozvole i sertifikati"
    (`cv-build-extras-step.tsx`); summary, links and the email switch sit
    in the basics step; description lines starting with "-" print as
    bullets. The three templates show the new sections when filled.
  - **PR 3 done** (`feat/cv-templates-restyle`): Klasičan, Moderan and
    Minimalan match the approved sketches. Klasičan is now one column
    (serif headings, Noto Serif bundled) and ATS-safe; Moderan's sidebar
    colour runs down every page and lists skills once (they were printed
    twice); Minimalan has titles in a left column. Shared `sections.tsx`
    takes a per-template `CvTheme`. Found: letter spacing above ~0.08 em
    makes PDF text readers split headings into letters ("K O N T A K T"),
    kept below that. Picker thumbnails: `pnpm cv:previews` (macOS `sips`)
    writes `apps/web/public/cv-templates/<code>.png`; the picker uses them
    when Sanity has no preview image.
  - **PR 4 done** (`feat/cv-templates-new`): Evropski (Europass structure:
    label column, CEFR table; no Europass name or logo) and Praktičan
    (licence, start date, certificates and languages in a box first, big
    phone). Codes: contracts, migration `0041_cv_template_codes.sql`,
    Sanity list, messages, registry, thumbnails. Picker facts
    (`cvTemplateInfo`) live in contracts so the web doesn't load react-pdf;
    cards show "Pogodan za online prijave" / "Najbolji za slanje direktno".
    The CV list shows the template name ("Generisan (Praktičan)"), not the
    code. Stefan asked to check that nothing from the form is lost: the
    start date ("Kada možeš da počneš") only reached Praktičan; now every
    template prints it. Tests: every field in every template (unit), and an
    e2e that fills every field through the UI and checks all five PDFs.
    Headings never end a page alone (`KeepWithFirst`).
  - **PR 5a done** (`feat/cv-accent-colour`): five accent colours (teal,
    navy, plum, burgundy, graphite; `cvAccentColors` in contracts, each
    ≥ 4.5:1 with white) picked in the template step; stored in
    `cv_profile.accent` (no migration), so the next CV keeps it. Klasičan
    stays black and white (swatches disabled, note shown).
  - **PR 5b done** (`feat/cv-photo`): candidate CV photo. `POST/GET/DELETE
/api/candidate/photo` (BFF forwards the client IP); any JPEG/PNG/WebP
    ≤ 5 MB, ≥ 200×200 is stored as a 600×600 JPEG (sharp: EXIF rotate,
    centre crop, metadata dropped) in the uploads `photo` area
    (`CANDIDATE_PHOTO_DIR` on disk, the bucket when configured; the copy
    script moves it too); `candidates.photo_storage_key` (migration 0043);
    replacing removes the old file. Builder: upload in the basics step
    with a preview, "Prikaži fotografiju na CV-u" (`cv_profile.showPhoto`,
    on after an upload). Moderan (round, sidebar) and Evropski (square,
    header) print it; picker badge "Može sa fotografijom".

### Plan steps, verified against code

| Step                  | State                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| 1–6, 8, 10, 11, 13    | Done                                                                                                 |
| 7 Employer signup     | Done; matched companies need approval; email verification works                                      |
| 9 Billing             | Core done + race-safe. Missing: credit notes, invoice PDF download, GAZDA creation, proforma expiry  |
| 12 Apply              | Done; verify-before-first-apply gate now satisfiable                                                 |
| 14 Promo              | Done exc. `full_free` auto-activation; currency + per-company cap fixed                              |
| 15 Discovery          | Done: public jobs, sitemaps, JSON-LD, landing pages, IndexNow / Indexing API (see SEO section)       |
| 16 GDPR / 17 CI gates | GDPR not started (needs legal copy); CI on `main` only, PRs checked locally (`pnpm verify`, e2e)     |
| 18 Hardening          | Auth limits, prod env guard, verification, reset, notifications done; no Sentry, no token revocation |

## Decisions (2026-10-27/28, Stefan)

- ~~Jobs list/detail stay behind login~~ → ~~public since the SEO branch~~ →
  ~~featured public, the rest teased (#20)~~ → **option B (2026-10-29,
  planned in `docs/plans/GUEST_ACCESS_B.md`)**: every job ad public and
  indexed; guests browse page 1 (20 jobs) of lists and searches, advanced
  filters and page 2+ need an account, similar jobs show 3 + a prompt.
  `PUBLIC_JOBS=false` still walls everything.
- **No GitHub Actions on PRs (2026-10-29, #32):** the Actions budget is nearly
  used up. PRs are checked locally (`pnpm verify`, `pnpm e2e`, plus
  `pnpm test:integration` for API/DB changes; see AGENTS.md "Checks run
  locally"); on `main`, `deploy-staging` runs CI + Integration before it
  deploys, and the quality report runs on push.
- Copy voice: **ti everywhere**; apply = "Konkuriši", "Prijava/Prijavi se"
  only means sign-in; enum labels in Serbian unless Serbians use the English
  word (Junior/Medior/Senior).
- Employer signup matching an existing company (PIB/MB/VAT/name) →
  **pending join request, moderator/admin approves**.
- Auth emails are sent directly by the API (raw tokens never stored);
  notifications go through the worker outbox.
- Candidates verify their email before the first application.
- Ship each phase when green (push, merge, deploy), then start the next.

## Phase A — safety hotfix ✅ deployed 2026-10-28

Company takeover closed, auth rate limits, prod boot guard, moderator
scoping, dev endpoints off in prod, first CI + e2e. Deploy fixes: no Nx
daemon in Docker builds, output asserted, sequential builds.

## Phase B — core loop ✅

- Email verification + password reset (`auth_tokens`, migration 0026),
  resend button, "forgot password" links; purchase requires a verified
  email (server-side).
- Notification emails via worker (new application, job published /
  rejected / expiring / expired, join request decided), retried and
  idempotent; billing mails share the sender.
- Paid ads expire (`expires_at` set on publish, backfill 0027); publish
  needs an active subscription; publish is row-locked and state-checked.
- Billing: row-locked mark-paid / activate / cancel, one live invoice per
  subscription (0028), NBS fetch outside the numbering lock, audit rows
  with payment reference / cancel reason.
- Promo: fixed codes carry a currency (0029); per-company cap race fixed.
- Auth forms POST (no credentials in URLs pre-hydration); register limit
  30/h/IP; dev seed refuses `NODE_ENV=production`.
- E2E: 10 specs incl. emails through a fake Resend; each new spec shown to
  fail without its fix.

## Phase C — security & operations hardening ✅

- Session revocation: `users.token_version` (0030); password reset and role
  changes kill existing refresh tokens (old tokens count as version 0, so
  the deploy logs nobody out).
- Worker: graceful SIGTERM shutdown (compose grace 30s); dead-lettered
  outbox rows no longer block the poll; partial index for the poll (0031).
- Editing a live job keeps its URL (short id survives re-approval; old
  slugs resolve by short id and 308 to the canonical slug).
- Deploy: Node 24 images, log rotation, HSTS (1y), nightly backup cron with
  14-day retention, runbook for off-VM image builds + rollback.
- `AGENTS.md` (shared rules), `CLAUDE.md` and Cursor rules fixed for this
  repo.

## Phase D — quality & abuse hardening ✅ (owner: Claude Code)

Worked in a separate worktree (`../hireforge-phase-d`) because another
agent was editing the main checkout at the same time.

- Applications: double submit → clean 409 (was a 500); withdraw is
  state-checked; employers don't see withdrawn applications and see the
  CV filename snapshotted at submission; atomic apply limiter.
- Security: BFF refuses `..` path segments (encoded params reached other
  Nest routes, e.g. staff login); external-click counter uses the trusted
  client IP; CV generation 20/h; saved searches deduped, cap 50.
- Search (0033): Serbian folding (Cyrillic, č/ć/š/ž/đ) on an index the
  query can use; list search now covers editor-authored descriptions.
  Slugs keep `đ` as `dj` and transliterate Cyrillic.
- Unpaid checkouts are cancelled after 14 days: proforma voided, promo
  redemption released, audited (worker scheduled tick).

## Phase T — test coverage ✅ (plan: `docs/plans/TEST_COVERAGE.md`)

- `libs/testing`: Vitest presets, Testcontainers Postgres 16 + Redis 7 (one
  pair per run, a migrated template DB, a database per test file), factories
  for every role and resource, Resend / NBS / Sanity stubs, PDF text, EXPLAIN.
- API (`apps/api/src/*.int.test.ts`, real `AppModule`): every route is in a
  registry with its access rule; every route × every role; company
  isolation for every owned resource; job, billing, application, auth and
  staff flows; races; query plans; security; search golden list; BFF ↔ Nest
  parity.
- Database: migrations from empty, `schema.ts` ↔ migrated DB drift,
  constraints. Worker: outbox, notifications, schedulers, the built
  `dist/apps/worker/main.js`, real BullMQ retries and dead letters.
- Unit: 90 % lines/branches gate on billing numbers, promo maths, slugs,
  the description sanitizer (XSS), templates, the billing PDF, the Sanity
  mapper; web component tests (apply form, checkout + promo, CV wizard,
  sign-in redirect, refresh middleware).
- Known bugs found are pinned as `it.fails` (below); fixes: Serbian proforma
  email typo ("izdata").
- Not yet: e2e for every role, axe/visual on every screen, browser security
  checks, the gates' own tests (T6–T10 in the plan).

## Phase E — candidates (mostly needs Stefan)

1. **Legal pages, account deletion, invoices and credit notes:** plan
   `docs/plans/LEGAL_AND_INVOICES.md` (C1–C5, Stefan's decisions
   2026-10-29).
   - **C1 live** (2026-10-29, #49, #52, #53): CMS legal pages `/privacy`,
     `/terms` and `/refunds`, published-only footer, sign-up and checkout
     links, and the terms version recorded at sign-up (migration 0035).
   - The texts were published on Stefan's approval (version `2026-10-29`,
     contact his Gmail since sljakam.com has no mailbox) and are pending
     lawyer review (`docs/legal/README.md`).
   - CMS rich text is now styled (the `prose` classes did nothing).
   - Stefan still has to redeploy the hosted Studio to edit them there.
   - Next, by Stefan's order (2026-10-29): the empty-site fixes and promo
     campaigns (`docs/plans/EMPTY_SITE_AND_CAMPAIGNS.md`), then C2
     (account deletion).
   - **Empty site, E** (branch `feat/empty-site`):
     - the fake "Nedelja besplatnih oglasa" slot ended in Sanity and is
       removed from the seed;
     - jobs and home pages show a "just getting started" panel when the
       site has no live job;
     - the employer dashboard has a first-job checklist (workspace
       `jobCounts`).
   - **Campaigns, P** (branch `feat/promo-campaigns`, migration 0037):
     - `promo_codes.kind` separates private codes (typed, never shown on the
       site) from public campaigns;
     - campaigns apply without a code, are advertised in the home banner and
       on the packages page, and have a Belgrade-time length (weekend, 7
       days or X days) plus pause;
     - with a typed code too, the lower price wins;
     - a free total activates the plan with no proforma or invoice (the old
       `it.fails` now passes);
     - admin screen "Kampanje"; promo codes gained pause.
2. Invoices: SEF is not needed for a paušalac outside VAT (checked, plan
   §1). Invoice fields and credit notes are plan C3 and C4. `full_free`
   promo auto-activation (zero-value invoices) still needs the
   accountant's answer.
3. **Found 2026-10-29: candidate CV files are not backed up.** The
   `api_var` volume is in no backup script; only Postgres is dumped.
4. Observability: Sentry — needs a DSN; offsite backups — needs storage.
5. Product: salary fields on jobs; GAZDA (enterprise) creation by admin;
   employer application status workflow (viewed / shortlisted / rejected).

## SEO & quality gates ✅ (branch `feat/seo-quality-gates`)

Plan and per-item log: [`docs/plans/SEO_AND_QUALITY_GATES.md`](./docs/plans/SEO_AND_QUALITY_GATES.md).

- **Public jobs** behind `PUBLIC_JOBS` (runtime env, default on): job list,
  detail, employers, company and landing pages need no login; apply/save do.
  Expired ads stay reachable (banner, noindex, no JobPosting, similar jobs).
  Missing job/company → 404; old slugs → 308 (Phase B's short-id fallback).
- **Crawling:** `robots.txt` (workspaces/API/apply disallowed; non-prod hosts
  `Disallow: /`), sitemap index (`pages`, `landing-N`, `companies-N`,
  `jobs-N`; hreflang sr/en/x-default; live jobs only), canonical + hreflang +
  OG on public pages, noindex on sign-in / filtered / empty / expired,
  server-rendered `<html lang>`, crawlable `?page=N` links.
- **Structured data:** Organization (+ `Sljakam`, `sljakam.com`), WebSite +
  SearchAction, JobPosting, BreadcrumbList, company Organization.
- **Landing pages:** `/jobs/city/{city}`, `/jobs/category/{category}`,
  `/jobs/category/{category}/city/{city}`; internal links in the footer, on
  landing pages and on job detail. City slugs: `đ → dj` (migration `0032`).
- **Discovery (env-gated, off until set):** verification meta tags,
  IndexNow key file + worker pings, Google Indexing API, manifest, `/llms.txt`.
- **Logo:** new mark ("S" with a check-mark caron) in the header and as all
  app icons / favicon (Stefan's request; concepts in `docs/design/`).
- **Quality gates:** migration guard, `check:i18n`, Husky, api/worker tests,
  axe in e2e (blocking); design tokens, contrast, visual baselines,
  Lighthouse, SEO audit (warn-only). e2e ports all configurable
  (`E2E_DB_NAME`, `E2E_REDIS_DB`, `E2E_API_PORT`, `E2E_WEB_PORT`,
  `E2E_MAIL_PORT`) so two checkouts can run e2e side by side.

Deferred (and why):

- `baseSalary` in JobPosting: no salary fields exist yet (Phase C didn't add
  them).
- Full-page ISR: the site header reads auth cookies (`noStore`), so every
  page renders per request; data fetches are cached (15 s–5 min).
- Visual baselines in dark mode: the UI has no dark theme yet.
- Company `logo` / `sameAs` in JSON-LD: we store no company logo or website.

Ideas (not in code):

- Render the header's auth state client-side so public pages can be cached
  (ISR) and revalidated on job publish/expire.
- A salary filter and salary landing pages once salary fields exist.
- Cyrillic (`/sr-Cyrl`) pages, for searches typed in Cyrillic (worth
  checking Search Console query data first).

Live verification (deployed `main@0d41284` on 2026-10-28, off-VM images,
backup first, migration `0032` applied, `PUBLIC_JOBS` at its default):

- Logged out: `/sr/jobs`, `/en/jobs`, `/sr/employers`, a job page and
  `/sr/jobs/city/beograd` answer 200; "apply" → 307 to
  `/sr/candidate/login?returnTo=/sr/jobs/…/apply`. `<html lang="sr">`, self
  canonical, `index, follow`.
- `robots.txt` as designed; sitemap index → `pages`, `landing-0`,
  `companies-0`, `jobs-0` (18 URLs); no sign-in URL; `www` → 301 → apex with
  the path; `/` → `/sr`.
- JobPosting on the live job parses: title = H1, description, datePosted,
  employmentType, hiringOrganization, jobLocation, identifier, directApply
  (no `validThrough`: that legacy row has no `expires_at`).
- `pnpm seo:audit https://sljakam.com`: 1 warning — `/sr/employers`
  description is 48 chars.
- `pnpm lighthouse https://sljakam.com` (mobile, median of 2):

  | Page                    | SEO  | A11y | Best pr. | Perf | Budget misses |
  | ----------------------- | ---- | ---- | -------- | ---- | ------------- |
  | `/sr`                   | 1.00 | 0.97 | 1.00     | 1.00 | —             |
  | `/sr/jobs`              | 1.00 | 0.96 | 0.96     | 0.93 | CLS 0.160     |
  | `/sr/jobs/city/beograd` | 1.00 | 0.96 | 0.96     | 0.93 | CLS 0.156     |
  | job page                | 1.00 | 0.96 | 1.00     | 1.00 | —             |

  Performance budget set to 0.90 from this run.

Follow-up fixes (`fix/seo-leftovers`, 2026-10-28):

- API outage → **500**, not 200 + `noindex`: job, company, landing and list
  pages throw `PublicApiUnavailableError` when the API is unreachable or
  answers 5xx/429 (`isPublicApiOutage` in `lib/public-jobs.ts`); 404/400
  still 404 or noindex. Landing pages no longer 404 during an outage.
  Checked against a production build with the API down: job, landing and
  list → 500; company served its cached copy.
- Layout shift on list/landing pages: the filter chips were streamed in
  behind a Suspense placeholder (64 px) and pushed the form down; the bar
  now renders in the first HTML (`e2e/landing.spec.ts`, JS off).
- `/sr/employers` meta description reuses the page intro (97 chars).
- Header logo link has an accessible name on phones (wordmark hidden).
- `GET /api/candidate/saved-jobs` answers `{items: []}` to guests instead of
  a 401 per job card (console errors on public pages).

Deployed `main@e2da182` (2026-10-28 15:16 UTC, attempt 1; backup first,
rollback tags `rollback-pre-leftovers`; no migrations). Live: api health ok,
worker `worker_started` (the #12 module change boots), no API errors;
unknown job / landing → 404; guest saved-jobs → `{items: []}`, guest save → 401. `seo:audit`: no warnings (two runs). Lighthouse, all four pages: SEO,
accessibility, best practices 1.00 or within budget; performance ≥ 0.9; CLS
0.000.

Note on `seo:audit`: one run right after the restart reported a company page
without canonical/description; it did not reproduce. Likely Next's streamed
metadata (tags sent after `<head>` to non-crawler user agents while the
first CMS fetch is slow); crawlers get them in `<head>`.

## Design review

`design/review-01.md` (2026-10-28): design system, UI/UX and accessibility
review with a Now / Next / Later roadmap and open questions for Stefan.
Stefan approved Now, Next and Later (2026-10-28); shipped in three phases.

### Design phase 1 — guest visibility + "Now" (branch `feat/design-now`)

- **Guest job visibility.** `PublicJobListItem.locked` (no company or
  excerpt), `lockedTotal` on the list, `lockedJobCount` on company pages,
  401 `JOB_SIGN_IN_REQUIRED` on a non-featured detail for guests (web 307s
  to sign-in with `returnTo`). Web forwards the viewer's access token from
  server fetches and the BFF (`lib/viewer-access-token.ts`); signed-in reads
  skip the fetch cache. Sitemap, landing/company indexing, JSON-LD, llms.txt
  and the indexing worker (non-featured → URL_DELETED) count featured jobs
  only. "Još N oglasa te čeka" prompt (`LockedJobsCta`).
- **Nav:** Poslovi/Poslodavci shown to guests; "Početna" dropped (logo).
  Home always links to the full list; "Najnoviji oglasi" when nothing is
  featured.
- **Copy:** developer text removed from user copy; empty vs filtered-empty
  states; ti voice, Konkuriši, Serbian style pass (sentence case,
  diacritics, plurals, no "portal", no unbacked claims); `Enums` namespace
  replaces `humanizeEnum`.
- **Accessibility:** Sheet primitive (`@radix-ui/react-dialog`, already in
  the lockfile via cmdk) for the phone menu (Escape, focus trap/return,
  Menu/X icons, 44px rows, sign-out at the bottom); skip link; hero search
  label + focus ring; link focus ring; `prefers-reduced-motion`; 44px touch
  targets on phones (chips, locale switch, footer links); chips
  `aria-pressed`; `--input` at 3:1.
- **returnTo** survives candidate sign-up (register page, login ↔ register
  links, job page "Napravi nalog").

Deployed 2026-10-29 (main@b71a292, PR #20), verified on sljakam.com.

### Design phase 2 — "Next" (branch `feat/design-next`)

- **Status tokens** `success`/`warning`/`info` (+ `-foreground`, `-soft`),
  `destructive-soft`, `featured` (logo gold) in both themes; all 56 contrast
  pairs pass (dark `--input` and destructive label fixed too). Hard-coded
  amber/emerald/red/sky/gray/teal moved to tokens (check:design 243 → 82;
  allowlist for dev page, global-error, manifest, skeletons). Left: home tile
  gradients and hero orbs (Later: flatten visuals) and arbitrary sizes.
- **Inter** via `next/font` (latin + latin-ext, self-hosted) and a type scale
  (`text-display`, `text-h1`–`h3`); every page title uses it.
- **Job page:** "Konkuriši" right under the title, apply section before the
  company block, and a sticky apply bar on phones (full page only).
- **Phones, jobs list:** results first; filters fold behind "Filteri (N)".
  Not a sheet: a portal would duplicate the form, a JS media query would
  shift layout. Without JS the folded filters can't open (crawlers don't
  need them). Desktop-only "Savet" tip removed.
- **Hero search:** what + where side by side (stacked on phones); fake tabs
  and the category select removed (categories are the tiles below).
- **Forms:** employer sign-up marks each invalid field (`aria-invalid`,
  message under it, focus moves there); `FieldError` + `fieldErrorProps`
  and `aria-invalid` styling in Input/Select/Textarea. The job form keeps
  native `required` + its inline image-URL error.
- **Confirmations:** `useConfirm` (Radix Dialog, alertdialog) replaces
  `window.confirm` (taxonomy delete, close won/lost) and now guards
  withdrawing an application.
- **Branded 404** (`[locale]/not-found.tsx`, catch-all `[...rest]`) and
  **error page** (`[locale]/error.tsx`, retry). No `loading.tsx`: streaming
  starts before a page picks its status, so missing jobs would stop being
  real 404s and locked jobs real 307s.
- Visual baselines re-rendered (font).

Deployed 2026-10-29 (main@96244e2, PR #22).

### Design phase 3 — "Later" (branch `feat/design-later`)

- **One workspace shell:** `WorkspaceShell` + `WorkspaceNav`
  (`components/`) replace four copied shells and navs; links set
  `aria-current="page"`, 44px on phones, pages sit in `<main>`, the container
  matches the header (`max-w-6xl`). Employer header: "Pogledaj javni profil"
  instead of the raw slug.
- **Employer signup: 2 steps for Serbian companies** (name + email +
  password → company, address and billing email prefilled from the account
  email), 3 for foreign ones (bank details for international invoices). The
  API still needs address and billing at signup; moving billing to checkout
  would need API + checkout work (not done).
- **Dark mode:** follows the system by default; header button cycles
  system / light / dark (saved in localStorage); a `<head>` script sets the
  class before paint (no flash); `color-scheme` for native controls. All
  token contrast pairs pass in dark; axe passes on key pages in dark.

### UI fixes (branch `fix/ui-brand-and-header-jump`, 2026-10-29)

Found with a scripted sweep of the live public pages at 375 and 1440 px
(overflow, console errors, failed requests, broken links, alt text, CLS).

- **Header nav jumped ~7px** between short and long pages (Employers is the
  shortest): the scrollbar came and went. `scrollbar-gutter: stable` on
  `:root`, and `body[data-scroll-locked]` keeps no extra margin so Radix
  menus/dialogs don't shift the page either.
- **Language switch reset the theme to light:** it re-renders `<html>`
  without the class the head script set; `ThemeToggle` re-applies the saved
  theme in a layout effect.
- **Broken category links** (home tiles + footer, 6 of 8 were 404s): CMS
  spotlight slugs the database doesn't have are dropped.
- **Hydration errors on dates:** no next-intl `timeZone` (server UTC vs
  browser), and signed-in tables used bare `toLocaleString()` (server
  en-US/UTC vs browser). Now `Europe/Belgrade` and `format.dateTime`.
- **"Hireforge" on the About page** came from the CMS seed (title, SEO,
  English body on the Serbian page). Seed now says Šljakam with a Serbian
  body; the live CMS document is patched separately. Internal names (repo,
  CMS doc id/slug `about-hireforge`, log prefixes) stay.
- **New Sanity project `o85214ma`** (branch `feat/cms-sljakam-project`,
  2026-10-29): nobody could find the login that owns `845zdl9k`, so Stefan
  made `o85214ma` under his account. Every old document came from one seed
  run (2026-05-08, no hand edits), so `pnpm cms:seed` recreated it, rebranded.
  Editorial bodies are now bilingual (`localeBlockContent`); the web still
  accepts the old single array (rollback, staging on the old env). Studio
  hosted at https://sljakam.sanity.studio. Setup: `docs/deployment/hetzner.md` §6.
  Live since release `48358d134e6c` (#41); production and staging env on
  `o85214ma`; publish webhook verified (an edit is live in ~2 s).
- Tests: `e2e/header-stability.spec.ts` (runs with real scrollbars),
  `home-jobs-discovery.test.ts`, `employer-job-applications-table.test.tsx`,
  `i18n/request.test.ts`; each shown failing without its fix.

### Launch categories, home tiles and CMS copy (branch `feat/home-taxonomy-and-cms-content`, 2026-10-29)

- **Categories** (`drizzle/0038`): `job_categories.sort_order`; `it` and
  `marketing` deleted on staging and production, replaced by Stefan's ten in
  his order (Trgovina i prodaja … Finansije i računovodstvo); search filter,
  footer and admin list in that order. The dev/e2e seed no longer adds `it` /
  `marketing` (it ran after the migration and brought them back); its sample
  job is in Informacione tehnologije. The integration template adds `it` /
  `marketing` itself, as test-only fixtures (`libs/testing/src/db/template.ts`).
- **Home tiles in Sanity** (`scripts/cms/home-discovery.mjs`, loaded by
  `pnpm cms:seed`): the ten categories and five cities in order, each with
  label, the declined button text (`exploreLabel`: "Istraži Suboticu") and a
  landing intro (`intro`). Category images are generated in the Design A
  palette (`scripts/cms/home-images/generate-category-images.mjs`, 1200×660);
  city photos are credit-free (Pixabay, Pexels, CC0, public domain; sources
  in `scripts/cms/home-images/cities/SOURCES.md`). Niš was swapped on
  2026-10-30 for the University of Niš (Pexels, Stefan's pick; free CC0/PD
  shots of the fortress are poor, the good ones are CC BY-SA and need a
  credit); only that row was patched in `development` and `production`. Web builds
  tile images at Design A sizes (categories 436×240, cities 1104×880) and
  `fetchCmsLandingSpotlight` gives the redesign's landing pages intro + hero.
  The design session (seo-31) renders them; this branch doesn't touch the rail.
- **CMS copy from Design A:** About body = pull quote (blockquote) + two
  paragraphs (sr/en); navigation without "Početna"; no campaign slots.
- Publishing `homeJobsDiscovery` now refreshes the home tiles at once
  (webhook route revalidates `cms:homeJobsDiscovery`).
- **Webhooks** (2026-10-31, `fix/cms-fresh-reads`): production and staging
  webhooks both answer 200, yet a publish took ~5 minutes to show: the web
  client read Sanity through the API CDN, so the webhook's immediate
  refetch cached the not-yet-updated copy. The web client now reads with
  `useCdn: false` (reads are already cached 5 minutes by Next), and
  publishing the About editorial page also refreshes `/sr/about` and
  `/en/about`.
- Order: deploy the migration to production **before** running the seed
  (staging and production share the Sanity dataset; the home page hides
  tiles whose slug the database doesn't have yet).
- **Seeded 2026-10-30 (Stefan's call, before the production deploy):** the
  shared `production` dataset has the new home tiles (with all city and
  category images), About and navigation; staging shows them. Until
  production is deployed, sljakam.com shows no category tiles (its database
  still has only `it` / `marketing`). Only those three documents were
  written: the full `pnpm cms:seed` also resets `campaign-calendar` to no
  slots and would wipe the live "Nedelja besplatnih oglasa" slot, so don't
  run it against `production` as is.

### Design review 02 (`design/review-02.md`, 2026-10-29)

Full sweep: 178 page views (every route × role × 375/1440 × light/dark) plus
the live site in launch state (empty DB). Findings and a Now/Next/Later
roadmap in the review; other sessions took the empty states, search and
known bugs. This branch (`feat/dashboards-packages-job-page`) fixes:

- **Dashboards with real data.** Candidate: applications in progress, the
  3 newest with status, saved jobs (no other page lists them), and a prompt
  when the name or a CV is missing. Employer: live / in review / applicants
  / free package slots, ads ending within 7 days, jobs with applicants. The
  employer jobs list (`GET /employer/jobs`) now returns `applicationCount`
  (withdrawn excluded) and `expiresAt`.
- **Packages:** each card lists "Uključeno" (✓) and "Nije uključeno" (—,
  with the packages that have it or the CMS upgrade message) instead of
  upsell lines that read like features; the dead "Uporedi sve pakete" link
  and the `OPTIONAL-PROMO` placeholder are gone.
- **Job page:** one apply button on a short ad (a second one at the end only
  past ~1200 characters, hidden on phones where the sticky bar is), the end
  date ("Ističe:") next to the published date, and no postal code in city
  names (cards, job page, company page; pickers and JSON-LD keep it).
- Test: `e2e/dashboards-and-job-page.spec.ts` (4 tests, all shown failing
  without the change) + unit tests for the overview and package helpers.

## Guest access option B (`docs/plans/GUEST_ACCESS_B.md`)

- **B1 + B2** (branch `feat/guest-access-b1`):
  - Every job ad is public and indexed again.
  - Guests browse the first 20 of any list, search or company page.
  - The advanced filters and page 2+ need an account.
  - Similar jobs show 3 plus a prompt.
  - Replaces the #20 teaser model.
- **B3** (branch `feat/guest-access-b3`):
  - A guest's "Konkuriši" opens a sign-up sheet over the job. Signing up
    continues to the apply form, which asks to confirm the email first.
  - Signed-in visitors go straight to the apply form; the old "Prijavi se da
    konkurišeš · Napravi nalog" line no longer shows to them.
  - From the 3rd distinct job page a guest opens, a dismissible bar offers an
    account. Hidden on auth/apply pages and on job pages on phones (the
    sticky apply bar is there); retired for good once dismissed or signed in.
- **B4 (2026-10-29):** prod database wiped on Stefan's request (backup
  `hireforge-postgres-20261029T085158Z.sql.gz`, also offsite). Kept cities,
  districts, job categories, packages, prices and entitlements; removed all
  users, companies, jobs and the dev seed. One admin account
  (Stefan's gmail, password set by reset email). Packages page: the featured
  hint now says the ad is on top of search and seen by guests too.
  The one orphaned CV file left in the `api_var` volume was deleted, so
  `candidate-uploads` is empty.
- **Search Console (2026-10-29):** sljakam.com is verified as a Domain
  property in Stefan's Google account by a `google-site-verification` TXT
  record in GoDaddy DNS. Keep that record. `https://sljakam.com/sitemap.xml`
  is submitted (status Success).
- **Sitemap without empty `/jobs`** (branch `fix/sitemap-empty-jobs`):
  `/sr/jobs` and `/en/jobs` are noindex while no job is live, so
  `pages.xml` now lists them only when at least one job is live. Search
  Console would otherwise flag them as "Submitted URL marked noindex".

## Staging pipeline (branch `feat/staging-pipeline`, 2026-10-29)

- **Decided (Stefan):** autofind-style pipeline; staging shares the safe
  production keys with every email redirected; same seed accounts with
  production's passwords, no copy of real data.
- **Done:**
  - `deploy-staging` / `deploy-production` workflows; `ci.yml` and
    `integration.yml` run on `main` only through `deploy-staging`. No image
    registry: the runner ships images over SSH like `ship.sh`, and
    production promotes the images staging left on the server.
  - `EMAIL_REDIRECT_TO` in `sendEmail` (unit test failed before the change).
  - Staging in its own worktree `/opt/hireforge-staging`, so a staging
    deploy never touches production's compose or Caddy files.
  - `release.sh`: lock; staging backups; shared keys synced from production
    (`staging-init.sh --env-only`); refuses staging with Resend and no
    redirect.
  - `restore-check.sh` deletes the dump it downloads; it used to stay on the
    VM, owned by root and readable by every user.
- **Verified on the server** (by hand, before merge):
  - A staging release ran from the new folder: lock, key sync, backup
    uploaded to `staging/`, migrate, all gates green.
  - The new restore check passed on prod and left no file behind.
- **Live:** Stefan added the CI deploy key and the `production` environment
  (creating server access for CI was his call). The first full
  `deploy-staging` run (#37) was green end to end. `EMAIL_REDIRECT_TO` is
  set on staging, and a test reset email reached Stefan's inbox.
- **Staging login removed** (Stefan, 2026-10-29): open, `noindex` header;
  optional via `STAGING_BASIC_AUTH_PASSWORD` (#38).
- **Follow-ups the same day:**
  - #39: visual baselines for #28 (scrollbar gutter) and #34 (B3 copy). The
    visual job is 12/12 again.
  - #40: `deploy-production` resolves a short SHA in a `resolve` job before
    the approval. `actions/checkout` takes only a full SHA.
  - #42: staging copies the Sanity project and dataset together with the
    read token. After the move to project `o85214ma` (#41), staging had the
    new token with the old project.
- **First production deploy through `deploy-production`:** run
  40863970186, `10c8004` (#43), approved by Stefan, all gates green.

### Incident 2026-10-29: sljakam.com served staging (~08:13–08:55 UTC)

- **Cause:** `compose.staging.yml` put staging's web on `hireforge-edge`.
  Compose also registers every service under its own name, so production's
  Caddy (`reverse_proxy web:3000`, on the same network) reached staging's
  web. Visitors saw staging without basic auth; sign-ups and password
  resets in that window went to the staging database (no email: staging had
  no Resend key).
- **Missed by my checks:** they tested staging through Caddy and that
  sljakam.com answered 200, never which backend answered. Found by the
  other session (a request logged by staging's api).
- **Fix** (branch `fix/staging-edge-alias`):
  - `release.sh` attaches staging's web as `staging-web` only.
  - New gate in every release: `web` in production's Caddy must be
    production's web container; otherwise staging is taken off the edge
    network and the release fails.
  - Reproduced locally first: the old setup fails the gate, the new one
    passes. Verified on the server: Caddy reaches staging as `staging-web`,
    and sljakam.com is production's.

## Redesign A (plan: `docs/plans/REDESIGN_A.md`, 2026-10-29)

Stefan picked direction A ("Topao i ljudski") from three homepage concepts;
every main page, the shared header and footer and a new About page are
concepts on https://claude.ai/artifact/TwJpGaQHuiJBXbd7H3cRhU. Rules: same
functionality and order, existing endpoints, one theme of role tokens,
shared components, CSS-only motion within the Lighthouse budgets.

- **Step 1, foundation** (branch `feat/redesign-foundation`):
  - Palette A in the existing tokens: warm cream page, warm lines and muted
    surfaces in light; a teal-tinted dark. New roles: `featured-soft`
    (+ `-foreground`), `placeholder` (+ `-foreground`), `footer`
    (+ `-foreground`). All 64 contrast pairs pass (the four new pairs are in
    `check:contrast`).
  - Motion: `--ease-bounce` and `--ease-soft`, plus `hf-lift`, `hf-press`,
    `hf-slide-down` and `hf-reveal` (scroll-driven where supported).
    Everything stops under reduced motion.
  - Site-wide promo bar above the header (`PromoBar`, `resolvePromoBanner`).
    It shows a campaign or the CMS announcement to guests, employers and
    staff, not to candidates. The homepage's own hero banner is gone.
  - Compact footer on the teal band with gold headings; same content.
  - Tests: `campaigns.spec.ts` checks the bar on `/sr/jobs` too (failed
    before). All 12 visual baselines were re-rendered and reviewed: only
    the background and the footer changed.
- **Step 2, homepage** (branch `feat/redesign-home`):
  - Hero as in the concept: trust chip, two-line title with the accent,
    the search card (Reči + Grad side by side, the button wraps below when
    the row is narrow), the first four categories as chips, and two
    floating featured-job cards on wide screens (`hf-float`).
  - Shared A job card (`PublicJobTeaserCard`, initials via
    `CompanyInitials`) used by every job strip; how-it-works as numbered
    cards; teal candidate and gold employer cards, the employer one with
    the campaign line.
  - Categories as a photo grid; the city accordion widens smoothly, its
    label card fades in once the tile has opened, and closed tiles are one
    big button with a pointer cursor (Stefan's feedback).
  - **Decided (Stefan):** the promo bar shows only an admin-started
    campaign (admin → campaigns, with its start and end). The CMS
    announcement no longer shows anywhere; `fetchCmsHomePromoBanner` is
    unused and can go together with its Sanity field later.
  - "Šljakam tek počinje" panel restyled in A and laid out by its own width
    (container query). On `/jobs` the list/preview split only appears when
    there is a list; empty states take the full width (Stefan).
  - SEO: home title "Oglasi za posao u Srbiji — Šljakam" and a description
    with "tražiš posao" / "oglasi za posao" (sr + en).
  - Visual tests run with reduced motion, and the reveal/float animations
    are off under reduced motion, so scroll-revealed sections are in the
    full-page baselines.
  - Tests: `promo-banner.test.ts` (campaign only), `seo.spec.ts` (home
    title words), `empty-site.spec.ts` (empty result spans the width); each
    failed before.
- **Step 3, Poslovi + Oglas** (branch `feat/redesign-jobs`):
  - Shared `SearchCard` / `SearchField` (`components/search-card.tsx`) for
    the home hero and `/jobs` (and the city/category landings, which use the
    same screen).
  - `/jobs`: big title with "N otvorenih pozicija"; guests get "Više
    filtera" plus a line saying what signing in unlocks; signed-in users
    get the chips as labelled rows in one card (same filters, same URLs).
    List cards with company initials, the selected card ringed; the guest
    "see all" banner in teal.
  - Job page (and the list preview, same component): cover band, initials
    tile, chips, big title; description and "O poslodavcu" cards; on wide
    screens a sticky "Konkurisanje" box beside the text replaces the button
    under the title (phones keep the bottom bar). Similar jobs as cards.
    The page is now full width (was `max-w-3xl`).
  - Tests: `jobs-list-layout.spec.ts` (count in the header; signed-in chip
    rows) and `dashboards-and-job-page.spec.ts` (apply box beside the
    description), each failed before; `design-next` now checks the apply
    button is not below the description (beside it on wide screens).
- **Step 4, Poslodavci, company, landings** (branch `feat/redesign-companies`):
  - `/employers`: hero card with the counts and a wall of company initials
    (plain tiles fill it up to six), the gold "Zapošljavaš?" pitch with the
    running campaign's line, company cards with a cover band, initials and
    the open-positions chip. The slug line on the cards is gone.
  - Company page: cover band, big initials tile, name, CMS headline and
    subhead, count chip; "Zašto kod nas" and "Utisci zaposlenih" (gold) as
    two cards; open jobs as whole-row links with chips.
  - City/category landings: a photo hero (the city's, else the category's,
    homepage tile image from CMS; a soft gradient without one) with the
    title, intro and count on a card; related cities/categories as pills.
  - Test: `campaigns.spec.ts` also checks the campaign line in the
    employers pitch (failed before).
- **Step 5, O platformi** (branch `feat/redesign-about`):
  - New editorial page: huge title with a gold highlight, a collage of the
    homepage category photos from CMS (soft tiles without them), a ticker
    of the real categories, a sticky deck of the three pillars (teal, gold,
    white), the CMS text with its excerpt as a pull quote, a timeline whose
    gold line draws on scroll, and a dark CTA.
  - The page no longer 404s without the CMS document: the CMS text is now
    an extra section. "Pogledaj poslove" shows to everyone (jobs are
    public), "Prijavi se" to guests.
  - New motion utilities: `hf-pop`, `hf-marquee`, `hf-draw` (off under
    reduced motion).
  - **For Stefan:** the About document in Sanity still says "Hireforge"
    and its body is in English on `/sr/about` (content, not code).
  - Tests: `about.spec.ts` (failed before); `about` added to the visual
    baselines.
- **Step 6, logos** (branch `feat/company-logos`):
  - Sanity: a square **Logo** image on Employer branding (no backend
    change). The web loads every logo once (`fetchCmsEmployerLogos`, tag
    `cms:employerLogos`, revalidated by the Sanity webhook) and hands the
    map to a client `CompanyLogosProvider` in the layout.
  - `CompanyInitials` takes the company slug and shows the logo when there
    is one, else the initials: job cards, job page, similar jobs,
    employers list and company page.
  - Needs the Studio deployed to show the field (NEEDS_STEFAN).
  - Test: `company-initials.test.tsx` (the logo case failed before).
- **Fix, scroll motion** (branch `fix/about-timeline-line`, 2026-10-30):
  Stefan saw the "Kako rastemo" line half drawn on staging. `overflow-hidden`
  on the About `<main>` (and the home hero section) made a scroll container
  that never scrolls, so every scroll-linked reveal inside froze at a fixed
  point and the sticky pillar cards did not stick. Now `overflow-clip`
  (same clipping, no scroll container). The line follows its whole section
  (`hf-draw-scope`) and is fully drawn once the section is on screen.
  Tests: `about.spec.ts` line test and `scroll-motion.spec.ts` (every
  scroll animation on the main public pages follows the page scroll); both
  failed before.
- **Demo jobs for design work** (branch `feat/demo-jobs-seed`, 2026-10-30):
  `pnpm db:seed:demo-jobs` fills a local DB with 300 live and ~12 ended
  jobs from 40 `demo-` companies, eight extra local categories and a
  big-city-weighted spread; deterministic, so before/after screenshots match.
  `-- --count N` for more, `-- --remove` to clear. Refuses non-local hosts.

## Analytics: Microsoft Clarity behind consent (branch `feat/clarity-consent`, 2026-10-31)

Stefan's choices: Clarity loads **only after "Prihvatam"**, records **only
public pages and the two sign-up pages**, no cookieless counter for now.

- `lib/analytics-consent.ts`: an allow-list of recorded paths (new private
  pages are never recorded by default; `/jobs/*/apply` is not), the
  `hf_analytics_consent` cookie (180 days) and `CLARITY_PROJECT_ID`
  (runtime env, validated; unset = no banner, no script, so staging, dev
  and e2e never record).
- `components/analytics-consent.tsx`: bottom banner with equal-weight
  Odbijam / Prihvatam and a privacy link; Microsoft's tag inserted only
  after acceptance with `consentv2` (ads denied); a private page reached by
  client navigation gets `data-clarity-mask` on `<body>` in a layout effect
  (before Clarity sees it) plus `clarity('pause')` (undocumented, best
  effort); withdrawal deletes `_clck` / `_clsk` and reloads without it.
  Footer "Podešavanja kolačića" reopens the banner. The profile menu is
  masked on public pages.
- Tests: `analytics-consent.test.ts` (paths, id), `analytics-consent.test.tsx`
  (clicks; the two "no load before consent" tests fail when the loader
  ignores the choice); `e2e/analytics-consent.spec.ts` against a second
  `next start` with a Clarity id (production build only) and the tag
  stubbed.
- Privacy policy drafts (`docs/legal/privacy.*.md`, version 2026-10-31):
  consent basis, Microsoft as processor, cookies, retention; lawyer items
  in `docs/legal/README.md`. `cms:seed:legal` gained `--only <kind>` and
  per-page dates. **Not live:** waits for Stefan to read the text and send
  the project id (NEEDS_STEFAN).

## Staff-created employer accounts (branch `feat/staff-employer-accounts`, 2026-10-31)

Plan and the follow-ups: `docs/plans/STAFF_ACCOUNTS_AND_UPLOADS.md`
(owner: session `hireforge-tests-b3`; PR 2 there is the uploads bucket).

- **Stefan's decisions:** companies never upload logos or photos, staff do;
  a company can exist without an account; staff create accounts by invite
  link; every uploaded file (CVs, candidate photos, job images, logos)
  moves to one private Hetzner bucket; Sanity keeps editorial content.
- On the moderator company page: **Add account** (email + invite language)
  links the account at once and emails a 7-day, single-use link; the link
  is also shown with **Copy link** (instead of a temporary password, which
  would have needed a forced change-password screen). Members show
  "Čeka aktivaciju" / "Aktivan", with **Pošalji ponovo** until activated.
  Audited as `employer_account.invite` / `invite_resend`.
- `/{locale}/accept-invite` sets the password, verifies the email, records
  the terms version (BFF, as on sign-up) and signs out other sessions.
- ~~Staff-created companies need PIB or MB~~ — reversed the same day
  (Stefan): identifiers are optional; matching falls back to the name, and
  approving the join request fills the company's empty fields (PIB, MB,
  address, billing contact) from the sign-up (branch
  `feat/optional-company-ids`, migration 0040 `company_input` on join
  requests; the moderator sees the submitted PIB/MB before approving).
  Staff can add or change PIB / MB (or the foreign identifiers) later in
  the company "Detalji" form (branch `feat/company-details-ids`), e.g. for
  a company whose account they created by invite.
- Migration `0039_auth_tokens_account_invite` (token purpose). Found on
  the way: CVs live on the VM in `api_var`, which no backup covers (PR 2).
- Tests: e2e (create company → add account → email → activate → sign in;
  resend voids the old link), shown failing before the change;
  integration `staff-accounts.int.test.ts` (9); contracts and email units.
- **Admins can do everything moderators can** (Stefan, 2026-10-31). The
  API already allowed it; the UI had two "Kompanije" tabs for admins, and
  the admin one had no create button or accounts. Now there is one: the
  moderator Kompanije screens, where admins also get "Premesti moderatora"
  and the assignment history. `/admin/companies[/:id]` redirect there
  (branch `fix/admin-company-create`, e2e `admin-companies.spec.ts`, shown
  failing first).

## Company logos, part 2b (branch `feat/company-logos`, 2026-10-31)

- Staff upload a company's logo on the moderator company page ("Logo":
  preview, "Otpremi logo", "Ukloni logo"); companies don't manage their
  own. PNG / JPEG / WebP ≤ 2 MB (no SVG: it can carry script), re-encoded
  to a 256 px square WebP with transparency kept, stored through
  `UploadStorageService` (area `logo`: bucket when configured, else
  `COMPANY_LOGO_DIR`); replacing or removing deletes the old file; audited.
- Migration 0042 (`companies.logo_storage_key`, `logo_updated_at`).
  `GET public/company-logos` (slug → versioned URL) is merged in the
  layout over Sanity's map, so every card and page shows it and Sanity
  logos stay a fallback; the BFF expires that cache on upload/removal.
  The image route caches for a year (the URL changes with each upload).
- The copy script also moves logos from disk. Tests: integration (square
  WebP, map, replace/remove leave no old files, SVG / broken files refused,
  moderator scope) and e2e (upload → public company page shows it →
  removed), both shown failing first.

## Uploads bucket, part 2a (branch `feat/uploads-storage`, 2026-10-31)

- CVs (uploaded and generated) are stored through one
  `UploadStorageService`: the private bucket `hireforge-uploads` under
  `S3_UPLOADS_PREFIX` (`production/`, `staging/`) once
  `S3_UPLOADS_BUCKET` is set, the old `api_var` folder until then (so this
  deploys safely before the bucket exists). A bucket without prefix/keys
  refuses to boot.
- `scripts/storage/copy-uploads-to-bucket.mjs` (in the api image) copies
  existing CVs; re-runnable, deletes nothing. Steps:
  `docs/deployment/hetzner.md` §6. `staging-init.sh` shares the bucket and
  sets `staging/`.
- Tests: integration against an S3 server (`adobe/s3mock` container):
  upload/download/delete land under the prefix with nothing on disk, a
  missing object is a clean 404, the copy script copies then skips;
  shown failing before. Units for the disk mode, unsafe keys, missing
  prefix.
- Waiting on Stefan: create the bucket (NEEDS_STEFAN 2).

## Analytics: Google Analytics 4 under the same banner (branch `feat/ga4-consent`, 2026-10-31)

- Stefan created the GA4 property (`G-6C1CJ9FVC6`, account "Šljakam",
  data sharing off except technical support). `GA_MEASUREMENT_ID` (runtime
  env, validated) joins `CLARITY_PROJECT_ID`; either one turns the banner
  on, and the banner names the configured tools.
- gtag loads only after "Prihvatam" with Consent Mode defaults (analytics
  granted, all ad signals denied), no Google signals, `send_page_view:
false`. We send `page_view` ourselves on public paths only; on a private
  path Google's `ga-disable-<id>` switch is set in the same layout effect
  that masks Clarity, so scroll/click events cannot fire there either.
  Withdrawal also deletes `_ga*`.
- Tests: component (gtag only after consent, consent defaults, config, one
  page view per public page, none and disabled on a private page; the test
  fails without the switch), id validation, e2e with both tags stubbed.
- Privacy drafts: Google LLC as processor, `_ga` cookies, 14-month
  retention. GA settings Stefan must keep: data retention 14 months,
  enhanced measurement's history page views and form interactions off.

## Sign-up draft, job search layout, employers pitch (branch `fix/signup-draft-and-job-list`, 2026-10-29)

- **Employer sign-up:** a first visit no longer shows "Vraćen je sačuvan
  nacrt". An empty form is never saved or restored, and the restore runs
  once per mount. A re-run used to put the empty draft back, so real drafts
  were lost too.
- **Job search:** the list scrolls with the page (window virtualizer), not
  in a ~3-card box. The search form comes first and is visible on phones.
  Guests get one locked "Više filtera" button (sign-in sheet) instead of 12
  locked chips (Stefan's choice). Signed-in users keep the chips, behind
  "Filteri" on phones.
- **Employers page:** no public prices (Stefan). A short pitch says posting
  is affordable and every ad is reviewed before it goes live, with
  "Napravi nalog poslodavca" / "Prijavi se". The copy is a draft for Stefan.
- **Tests:** new e2e `employer-register-draft`, `jobs-list-layout` and
  `employers-pitch` (each failed before). `design-next`, `landing`,
  `guest-job-visibility` and `keyboard-and-menu` were updated to the new
  layout. Visual baselines for jobs-list and landing-city were re-rendered
  (Linux) and reviewed.

## Moderator scope (branch `fix/moderator-company-scope`, 2026-10-29)

- **Decided (Stefan):** moderators act only on their own companies and the
  lead pool (`unassigned`, `closed_lost`), like company details already did;
  admins on everything.
- **Done:** one rule in `apps/api/src/staff/staff-company-access.ts`
  (`staffCanAccessCompany`, its SQL form `staffCompanyScope`,
  `assertStaffCanAccessCompany`), applied to the employer list, moving an
  employer (both the current and the target company), creating a job on
  behalf of a company and the job composer bootstrap. Out of scope → 403
  `STAFF_COMPANY_VIEW_FORBIDDEN`.
- **Tests:** the pinned `it.fails` flipped, 5 new integration tests and
  e2e `moderator-scope.spec.ts` (the seed moderator's employer list); each
  failed before the fix.
- **Not changed:** the moderation queue (publish / reject) stays shared by
  all moderators.

## Known bugs, round 2 (branch `fix/known-bugs-candidate`, 2026-10-29)

Fixed, each pinned `it.fails` test flipped to `it` (failed before the fix):

- CV uploads keep Serbian letters: the name is re-decoded from multer's
  latin1 as UTF-8 and `safeBasename` keeps letters of any script.
- Employers read cover letters: the applicants list returns
  `coverLetterText` and the table has a "Pročitaj" toggle (e2e
  `cover-letter.spec.ts` clicks it as the employer).
- CV wizard: every experience / education / skill field has a label tied to
  its input.
- Search finds word forms (migration 0036): query words lose a common
  Serbian ending and are prefix-matched (`kuvari`, `kuvarima` → `Kuvar`);
  words under 4 letters stay exact; the job index is unchanged.

## Known bugs, round 1 (branch `fix/known-bugs-security`, 2026-10-29)

Fixed, each pinned `it.fails` test flipped to `it` (failed before the fix):

- Another company's job id answers 404 `JOB_NOT_FOUND`, like an unknown id
  (was 403 `JOB_FORBIDDEN_COMPANY`, which confirmed the id exists).
- Two simultaneous sign-ups of the same new company: the second becomes a
  join request (transaction advisory lock), no more 500 on the unique PIB.
- Images of unpublished jobs: 404 for everyone except the job's company and
  staff, who get them `private, no-store` (editor preview keeps working).
- A JSON body over the size limit is a 413 `PAYLOAD_TOO_LARGE`, not a crash.
- `staff_audit_log.actor_user_id` is ON DELETE SET NULL (migration 0034).
- Sign-in `returnTo` refuses `/\host` and control characters too (one shared
  `isSafeReturnPath`).

## Known issues not yet scheduled

Phase T pinned these with an `it.fails` test named after the fix; fixing the
bug turns it red and it is flipped to `it`.

- Contracts' `applicationResponseSchema` is unused (`POST
/candidate/applications` answers `{ id }`).

- `drizzle/meta` only has the `0000` snapshot → `pnpm db:generate` would
  emit a bogus full-schema migration; keep hand-writing migrations.
- Bank details for invoices are editable in Sanity (payment redirection risk).
- `mergeCompanyRowFromSelfSignup` (libs/server/employers) is unused since
  Phase A; keep only if approval should fill blank company fields.
- Admin has no join-request queue on `/admin` (admins can use the moderator
  companies page).
- TypeScript 6 upgrade: TS 6 deprecates `baseUrl`, but the API webpack build
  (`NxAppWebpackPlugin` → `tsconfig-paths`) needs it to resolve `database`,
  `contracts`, `server-*`. Before upgrading, resolve those aliases in
  `apps/api/webpack.config.js` (from `tsconfig.base.json` paths), then drop
  `baseUrl` from `tsconfig.base.json` and `apps/web/tsconfig.json`. Until
  then the editor uses the workspace TS 5.9 (`.vscode/settings.json`).
