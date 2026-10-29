# Šljakam — progress & launch backlog

Living status file. **Trust this over the `Status:` lines in
[`docs/refactor/MIGRATION_PLAN.md`](./docs/refactor/MIGRATION_PLAN.md)**,
which went stale during the Cursor phase (Steps 4, 5, 14, 15 say "pending"
but shipped). Update this file in the same PR as the work.

Last updated: 2026-10-28 (SEO & quality gates, Phase D, Phase T tests). Open items for
Stefan: [`NEEDS_STEFAN.md`](./NEEDS_STEFAN.md).

## Current state

- **Prod:** `sljakam.com` on one Hetzner VM (Docker Compose + Caddy, see
  [`docs/deployment/hetzner.md`](./docs/deployment/hetzner.md)). No real
  users yet. **Never build images on the VM** (3.8 GB, no swap — it took
  the site down for ~18 min on 2026-10-28). Deploy with
  `./scripts/deploy/ship.sh` from a clean checkout of `origin/main`:
  off-VM build, backup, migrate, health gates with automatic rollback,
  images of the last 3 releases kept (`backups/releases.log`); rollback
  `scripts/deploy/release.sh <sha>` on the server. Since 2026-10-29 the
  images are ~0.7–0.9 GB on the VM (were ~4.5 GB; the disk had reached 90%,
  now ~13%). First ship.sh deploy: `main@d2d1d76` (#23 + #24), attempt 1,
  all gates green, seo:audit and Lighthouse clean. `main@d1a49c1` (#27) was
  rolled back automatically by a gate bug (unchanged worker image; fixed in
  #29); `main@ee02722` (#27–#29) live 2026-10-29 01:24 UTC.
- **Backups:** nightly + per deploy on the VM; off-server upload ready
  (`S3_BACKUP_BUCKET`, waits on the bucket); restore drill passed on prod.
- **Staging:** `staging.sljakam.com` on the same VM (`compose.staging.yml`,
  `ship.sh staging`); env generated, not started: needs DNS and memory
  (NEEDS_STEFAN items 1b, 2).
- **Checks:** `pnpm lint && pnpm format && pnpm typecheck && pnpm test &&
pnpm build` (+ `pnpm check:i18n`); CI runs it on PRs. Husky: pre-commit
  lint-staged, pre-push lint/typecheck/test/i18n (blocking) + design and
  contrast reports (warn-only). `pnpm test` covers api and worker and the
  merged-migration guard, plus a 90 % coverage gate on dense logic.
- **Integration:** `pnpm test:integration` (Docker; real Postgres + Redis
  through Testcontainers, ~75 s): route registry + role matrix, company
  isolation, flows, races, query plans, schema drift, the built worker.
  CI runs it on push to `main` (`integration.yml`), not on PRs. How to
  test: [`docs/TESTING.md`](./docs/TESTING.md).
- **Warn-only reports:** `pnpm check:design`, `pnpm check:contrast`,
  `pnpm e2e:visual`, `pnpm lighthouse <url>`, `pnpm seo:audit <url>`;
  on CI in `quality-report.yml` (push to main / dispatch, never PRs).
- **E2E:** `pnpm e2e` (Playwright) recreates an isolated `<db>_e2e`
  database + Redis DB 15, builds API + worker, starts a fake Resend
  (`e2e/support/fake-resend.mjs`) and the worker, and serves web with
  `next dev` (local) or a production build with `E2E_WEB=start` (CI).
  Tests that need email read it from the fake (`e2e/support/mail.ts`).

### Plan steps, verified against code

| Step                  | State                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| 1–6, 8, 10, 11, 13    | Done                                                                                                 |
| 7 Employer signup     | Done; matched companies need approval; email verification works                                      |
| 9 Billing             | Core done + race-safe. Missing: credit notes, invoice PDF download, GAZDA creation, proforma expiry  |
| 12 Apply              | Done; verify-before-first-apply gate now satisfiable                                                 |
| 14 Promo              | Done exc. `full_free` auto-activation; currency + per-company cap fixed                              |
| 15 Discovery          | Done: public jobs, sitemaps, JSON-LD, landing pages, IndexNow / Indexing API (see SEO section)       |
| 16 GDPR / 17 CI gates | GDPR not started (needs legal copy); CI with checks + e2e exists                                     |
| 18 Hardening          | Auth limits, prod env guard, verification, reset, notifications done; no Sentry, no token revocation |

## Decisions (2026-10-27/28, Stefan)

- ~~Jobs list/detail stay behind login~~ → ~~public since the SEO branch~~ →
  ~~featured public, the rest teased (#20)~~ → **option B (2026-10-29,
  planned in `docs/plans/GUEST_ACCESS_B.md`)**: every job ad public and
  indexed; guests browse page 1 (20 jobs) of lists and searches, advanced
  filters and page 2+ need an account, similar jobs show 3 + a prompt.
  `PUBLIC_JOBS=false` still walls everything.
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

1. Legal pages (privacy, terms, refund) + footer links + account erasure
   request — needs legal copy.
2. Invoices: legal fields, credit notes, invoice PDF download, SEF — needs
   the accountant's answers. `full_free` promo auto-activation (zero-value
   invoices) — same question.
3. Observability: Sentry — needs a DSN; offsite backups — needs storage.
4. Product: salary fields on jobs; GAZDA (enterprise) creation by admin;
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
- Tests: `e2e/header-stability.spec.ts` (runs with real scrollbars),
  `home-jobs-discovery.test.ts`, `employer-job-applications-table.test.tsx`,
  `i18n/request.test.ts`; each shown failing without its fix.

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
- **Next: B4** — archive the seed job and resubmit the sitemap in Search
  Console (Stefan), reword the packages page (`TODO(Stefan)`).

## Known issues not yet scheduled

Phase T pinned these with an `it.fails` test named after the fix; fixing the
bug turns it red and it is flipped to `it`.

- Moderators can move any employer into any company
  (`PATCH /api/moderator/employers/:id` has no pipeline check) —
  `company-isolation.int.test.ts`. Needs a decision (NEEDS_STEFAN.md).
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
- Search has no word forms (`kuvari` doesn't find `Kuvar`).
- CV wizard: experience / education / skill row labels aren't tied to their
  inputs (screen readers).
- Sign-in `returnTo` refuses `//host` but not `/\host` (safe while
  `localePrefix: 'always'`).
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
