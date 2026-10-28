# Šljakam — progress & launch backlog

Living status file. **Trust this over the `Status:` lines in
[`docs/refactor/MIGRATION_PLAN.md`](./docs/refactor/MIGRATION_PLAN.md)**,
which went stale during the Cursor phase (Steps 4, 5, 14, 15 say "pending"
but shipped). Update this file in the same PR as the work.

Last updated: 2026-10-28 (Phase B). Open items for Stefan:
[`NEEDS_STEFAN.md`](./NEEDS_STEFAN.md) — **#1 is urgent (seed passwords on prod).**

## Current state

- **Prod:** `sljakam.com` on one Hetzner VM (Docker Compose + Caddy, see
  [`docs/deployment/hetzner.md`](./docs/deployment/hetzner.md)). No real
  users yet. **Never build images on the VM** (3.8 GB, no swap — it took
  the site down for ~18 min on 2026-10-28); build linux/amd64 images
  locally, `docker save | ssh … docker load`, then
  `docker compose up -d --no-build`.
- **Checks:** `pnpm lint && pnpm format && pnpm typecheck && pnpm test &&
pnpm build`; CI runs it on PRs. `apps/api` / `apps/worker` have no
  `typecheck` target, so their type errors surface in `build`.
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
| 15 Discovery          | Partial; SEO work lives on the separate `feat/seo-quality-gates` branch                              |
| 16 GDPR / 17 CI gates | GDPR not started (needs legal copy); CI with checks + e2e exists                                     |
| 18 Hardening          | Auth limits, prod env guard, verification, reset, notifications done; no Sentry, no token revocation |

## Decisions (2026-10-27/28, Stefan)

- Jobs list/detail **stay behind login** for now; sign-up as easy as
  possible. (SEO branch may flip this behind `PUBLIC_JOBS`.)
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

## Phase C — security & operations hardening (owner: Claude Code, in progress)

1. Refresh-token revocation (`users.token_version`): password reset and
   "sign out everywhere" kill existing sessions.
2. Worker graceful shutdown; outbox rows that keep failing stop blocking
   the queue (dead after N attempts) + partial index for the poll.
3. Editing a published job keeps its URL (stable `short_id`, redirect).
4. Docker: Node 24 base images (20 is EOL), log rotation; Caddy HSTS.
5. Scheduled Postgres backups with retention (offsite needs Stefan).

Needs Stefan before it can start: legal pages copy, accountant (VAT, SEF,
invoice fields, credit notes), Sentry DSN, offsite backup storage.

## Known issues not yet scheduled

- Editing a published job drops its slug → old URLs 404.
- Search: query expression doesn't match the FTS index (seq scan); no
  diacritic/Cyrillic folding; slug transliteration drops `đ`.
- Outbox: a stuck event can block later ones; no worker SIGTERM handling.
- `drizzle/meta` only has the `0000` snapshot → `pnpm db:generate` would
  emit a bogus full-schema migration; keep hand-writing migrations.
- Bank details for invoices are editable in Sanity (payment redirection risk).
- `mergeCompanyRowFromSelfSignup` (libs/server/employers) is unused since
  Phase A; keep only if approval should fill blank company fields.
- Admin has no join-request queue on `/admin` (admins can use the moderator
  companies page).
