# Šljakam — progress & launch backlog

Living status file. **Trust this over the `Status:` lines in
[`docs/refactor/MIGRATION_PLAN.md`](./docs/refactor/MIGRATION_PLAN.md)**,
which went stale during the Cursor phase (Steps 4, 5, 14, 15 say "pending"
but shipped). Update this file in the same PR as the work.

Last updated: 2026-10-28 (handoff audit + Phase A).

## Current state

- **Prod:** `sljakam.com` is live on one Hetzner VM (Docker Compose + Caddy,
  see [`docs/deployment/hetzner.md`](./docs/deployment/hetzner.md)). No real
  users yet.
- **Checks:** `pnpm lint && pnpm format && pnpm typecheck && pnpm test &&
pnpm build` is green; CI runs it on PRs (`.github/workflows/ci.yml`).
  `apps/api` and `apps/worker` have no `typecheck` target, so their type
  errors only surface in `build`.
- **E2E:** `pnpm e2e` (Playwright) recreates an isolated `<db>_e2e`
  database + Redis DB 15, builds the API, boots API :4100 + Next :3100.
  Specs live in `e2e/`. CI runs it in the `e2e` job.

### Plan steps, verified against code

| Step                  | State                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| 1–6, 8, 10, 11, 13    | Done (10 has the job-expiry bug below)                                                         |
| 7 Employer signup     | Done; matched companies now need approval (Phase A). **No email verification flow.**           |
| 9 Billing             | Core done. Missing: credit notes, invoice PDF download, GAZDA creation, unpaid-proforma expiry |
| 12 Apply              | Code done but **unusable**: requires `email_verified_at`, which nothing sets                   |
| 14 Promo              | Mostly done; `full_free` still needs manual mark-paid; per-company cap not race-safe           |
| 15 Discovery          | Partial: no job URLs in sitemap, no JobPosting JSON-LD, no salary fields                       |
| 16 GDPR / 17 CI gates | Not started (basic CI now exists)                                                              |
| 18 Hardening          | Partly: auth rate limits + prod env guard done (Phase A); no Sentry/PostHog, no password reset |

## Decisions (2026-10-27, Stefan)

- Jobs list/detail **stay behind login**; make sign-up as easy as possible.
  (PRODUCT_SSOT §162 says public — SSOT to be updated.) Trade-off: no SEO.
- Employer signup matching an existing company (PIB/MB/VAT/name) →
  **pending join request, moderator/admin approves**.

## Phase A — safety hotfix ✅ (branch `fix/phase-a-safety`)

- Company takeover via public PIB/MB closed (`company_join_requests`,
  migration `0025`, moderator queue on `/moderator/companies`, e2e).
- Auth rate limits (login per IP + per email, register, refresh); BFF
  forwards client IP.
- API refuses to boot in prod with `AUTH_DEV_HEADERS=1` or placeholder /
  short secrets; dev impersonation inert in prod; raw DB errors no longer
  returned to clients.
- Moderators scoped to own companies + lead pool (list + detail).
- Web `/api/integration` and `/api/hello` dev-only.
- Lint/format green, nested `node_modules` untracked, first CI.

**Before deploying Phase A:** run migrations (`0025`), and make sure
`deploy/.env.production` has real `AUTH_JWT_SECRET`, `CMS_SYNC_SECRET`,
`SANITY_WEBHOOK_SECRET` (≥ 32 chars, no `replace-with…`) or the API will
refuse to start.

## Phase B — make the core loop work (next)

1. **Email:** generic Resend dispatcher in the worker (not billing-only),
   email verification + password reset endpoints/pages, "new applicant"
   and "application status" mails, "join request decided" mail.
2. **Job expiry:** `expires_at` is never written → paid ads never expire.
   Set on publish (`min(now + duration, subscription.ends_at)`), expire a
   subscription's jobs when it ends, require an active subscription to
   publish. Add `job_expired` / `job_expiring_soon` to outbox event types.
3. **Billing races:** row-lock subscription on mark-paid / activate /
   cancel; unique invoice per subscription; per-company promo cap under
   lock; promo currency; credit-note issuance; audit rows for mark-paid.
4. **Publish races:** conditional `UPDATE … WHERE status IN (…)` in
   publish / archive paths.
5. **Tests:** API integration tests (Postgres) for subscriptions, promo,
   numbering; e2e for purchase → mark-paid → publish.

## Phase C — legal & launch floor

- Privacy / terms / refund pages (sr + en), footer links; account erasure
  on request. Confirm VAT status of the legal entity and required invoice
  fields (seller/buyer PIB, MB, address, line items, date of supply) —
  **TODO(Stefan): accountant.**
- Salary fields on jobs (headline positioning claim, no columns today).
- Observability: Sentry (api, worker, web), offsite Postgres backups on a
  schedule, HSTS + CSP in Caddy, Docker log rotation.
- Infra: Node 20 base images are EOL (Apr 2026) → Node 24; Next
  `output: 'standalone'`; build images in CI instead of on the VM.

## Known issues not yet scheduled

- Refresh tokens are stateless (14 days) — no revoke on logout/password change.
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
