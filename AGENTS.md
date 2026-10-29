# Šljakam (hireforge) — agent rules

House rules for every AI agent (Cursor reads this file; Claude Code reads it
through CLAUDE.md). Product facts live in `PRODUCT_SSOT_SLJAKAM.md`, technical
background in `PROJECT_SSOT.md`, the step plan in
`docs/refactor/MIGRATION_PLAN.md`, the **current state and next phase in
`PROGRESS.md`**, and anything waiting on Stefan in `NEEDS_STEFAN.md`. Read the
relevant ones before changing code. When docs and code disagree, trust the
code and fix the doc.

## Stack

Nx monorepo · Next.js 16 + next-intl (`apps/web`, BFF routes under
`app/api`) · NestJS 11 (`apps/api`, private) · BullMQ worker (`apps/worker`,
outbox → jobs) · Sanity Studio (`apps/cms`) · Postgres + Drizzle
(`libs/database`, hand-written SQL in `drizzle/`) · Redis · Tailwind v4 +
shadcn · Zod contracts (`libs/contracts`) · Vitest + Playwright · Docker
Compose + Caddy on one Hetzner VM.

## Commands

- dev: `pnpm docker:up` then `pnpm dev:all` (web :3000, api :4000, cms :4200)
- lint: `pnpm lint` · format: `pnpm format` · types: `pnpm typecheck` · unit:
  `pnpm test` · build: `pnpm build` (api/worker type errors only show here)
- e2e: `pnpm e2e` (isolated `<db>_e2e` DB, fake Resend, worker; CI uses
  `E2E_WEB=start`)
- whole-repo check before any commit:
  `pnpm lint && pnpm format && pnpm typecheck && pnpm test && pnpm build`
- migrations: add `drizzle/NNNN_*.sql` (header with rollback), its journal
  entry and the `schema.ts` change; apply with `pnpm db:migrate`. Do not use
  `pnpm db:generate` (only the 0000 snapshot exists).

## Conventions

- User-facing copy in `apps/web/src/messages/{sr,en}.json` (parity test);
  API errors are typed codes in `libs/contracts/src/lib/api-errors.ts` with
  matching `Errors.*` messages.
- Request validation with Zod contracts; Nest services throw `coded*`
  helpers from `apps/api/src/http/coded-http.ts`.
- Web never calls Nest from the browser: client → Next BFF route → Nest.
  BFF routes forward the client IP (`forwardClientIpHeaders`) and validate
  path params before building upstream URLs.
- State changes that race (publish, mark-paid, decisions) lock the row in
  the same transaction; side effects go through `outbox_events`.
- Comments explain why, briefly; never narrate the code.
- Commits: `<type>(<scope>): <summary>`. Branches: `fix/…`, `feat/…`.

## Definition of done

1. Whole-repo check passes locally (show the output) and `pnpm e2e` is green.
2. New behaviour has a test that fails without the change (show it failing).
3. UI checked at 375 and 1440 px.
4. `PROGRESS.md` updated; blockers for Stefan added to `NEEDS_STEFAN.md`.
5. A finished phase is pushed, merged after green CI, deployed, and verified
   on https://sljakam.com (Stefan's standing instruction).

## Deploy

**Never build images on the VM** (3.8 GB RAM, no swap: it took the site down
on 2026-10-28). Deploy from a clean checkout of a commit on `origin/main`
with `./scripts/deploy/ship.sh`: it builds off the VM, ships, backs up,
migrates, gates on health with automatic rollback and keeps the images of
the last 3 releases. Rollback: `scripts/deploy/release.sh <sha>` on the
server. Staging (same VM, same images): `ship.sh staging` first, then
`ship.sh`. Details: `docs/deployment/hetzner.md` §9–10.

## Never

- Change files outside the task scope without asking.
- Commit or push while any check is red.
- Add a service, dependency, queue or abstraction without saying why.
- Invent facts, prices, legal text or names; leave `TODO(Stefan)` instead.
- Put secrets in code, commits, chat or `NEEDS_STEFAN.md`.
- Run the dev seed (`pnpm db:seed:domain`) against production.
- Force-push without a backup branch and `--force-with-lease`.
- Leave dev servers or background processes running.
