# Hireforge

Private monorepo — proprietary software **© Šljakam**. All rights reserved.

The product ships as **Šljakam** on the **`sljakam.com`** domain. The
display brand uses the diacritic (`Šljakam`) on every user-facing surface;
the ASCII form (`sljakam`) is used in the domain, URLs, slugs, env vars,
and identifiers. See [`PRODUCT_SSOT_SLJAKAM.md`](./PRODUCT_SSOT_SLJAKAM.md)
§1.1.1 for the full brand split rule.

`hireforge` is the internal repository codename and is **not** renamed.

Modern hiring platform targeting the Serbian market, positioned against legacy job portals by prioritizing **speed, clarity, search quality, and trust** (salary transparency, verified employers, strong candidate/employer UX).

| Document                                                                 | What you’ll find there                                                                                                                                                      |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[PRODUCT_SSOT_SLJAKAM.md](./PRODUCT_SSOT_SLJAKAM.md)**                 | Product & operations SSOT: brand, scope, personas, packages (TEZGA / ŠLJAKA / ŠEF / GAZDA), billing, sales ownership, lifecycle state machines, KPIs, operating principles. |
| **[PROJECT_SSOT.md](./PROJECT_SSOT.md)**                                 | Technical SSOT: stack, architecture, repo layout, competitor context (Poslovi Infostud), implementation phases.                                                             |
| **[docs/refactor/MIGRATION_PLAN.md](./docs/refactor/MIGRATION_PLAN.md)** | Step-by-step execution plan for the refactor (18 steps, mini-steps, verification gates).                                                                                    |

## Stack (summary)

**Nx** monorepo — **Next.js** (`web`), **NestJS** (`api`), **worker** (BullMQ), **cms** (Sanity Studio). **PostgreSQL** (Drizzle), **Redis**. **Tailwind CSS v4** (`@tailwindcss/postcss`) for `apps/web` and shared `libs/ui` classes. Content: **Sanity**.

## Prerequisites

- **Node.js** 20+ (align with Nest/Vite engines in use)
- **pnpm** 10 (`packageManager` in `package.json`)
- **Docker** (optional, for local Postgres + Redis via `docker compose`)

## First-time setup

1. Clone and install: `pnpm install`
2. Copy env: `cp .env.example .env` and adjust secrets/ports (see comments in `.env.example`).
3. Start databases: `pnpm docker:up`
4. Apply DB schema (dev): `pnpm db:push` (requires `DATABASE_URL` in `.env`)
5. (Optional) Seed data:
   - `pnpm db:seed` — RS locations + dev users and sample job (see `scripts/db/seed-domain-baseline.sql` header for passwords)
   - `pnpm cms:seed` — baseline Sanity docs (`siteSettings`, `navigation`, sample `editorialPage`, sample `employerBranding`); requires `SANITY_API_WRITE_TOKEN`
6. Run apps (pick one):
   - **All dev servers in one terminal:** `pnpm dev:all` (web, api, worker, cms — each uses its own port)
   - **Individually:** `pnpm dev:web` · `pnpm dev:api` · `pnpm dev:worker` · `pnpm dev:cms`

Default local URLs (from `.env.example`): **web** `http://localhost:3000`, **api** `http://localhost:4000/api`, **cms** `http://localhost:4200`.

For `apps/cms`, set `SANITY_STUDIO_PROJECT_ID` and `SANITY_STUDIO_DATASET` (or the `NEXT_PUBLIC_SANITY_*` equivalents) in the repo-root `.env`. The Studio now fails fast when they are missing, instead of silently connecting to a fallback project.

Sanity publish webhook (Phase 8.3): configure a webhook in Sanity to `POST` to `http://localhost:3000/api/revalidate/sanity?secret=<SANITY_WEBHOOK_SECRET>` (or your deployed web URL). This revalidates CMS tags/paths without redeploy.

## Domain & roles

- **Drizzle schema** in `libs/database/src/schema.ts`: users + roles, companies, employers, candidates, taxonomy (`cities`, `job_categories`), `jobs` (with lifecycle enum), `applications`, `outbox_events` (renamed from `outbox`).
- **Migrations:** `drizzle/0001_core_domain.sql` + journal. Apply with `pnpm db:migrate` or sync dev DB with `pnpm db:push`.
- **Serbian locations (optional):** `pnpm db:seed:rs` — loads `scripts/db/data/rs-municipalities.json` into `districts` + `cities`.
- **Baseline seed (optional):** `pnpm db:seed:domain` (or `psql "$DATABASE_URL" -f scripts/db/seed-domain-baseline.sql`) — dev users (**admin**, **employer**, **candidate**, moderator) with bcrypt passwords; see SQL header for the shared dev password (employer login: **`/employer/login`**).
- **Contracts:** `libs/contracts` — `UserRole`, job/application enums, Zod schemas, `PERMISSIONS` matrix.
- **API auth (dev):** `AUTH_DEV_HEADERS=1` + header `X-Hireforge-Dev-User-Id: <uuid>` loads `request.hireforgeUser` from Postgres (role from DB). Routes: `GET /api/internal/whoami`, `GET /api/internal/admin/ping` (admin only).

## Billing PDFs & email

- **Storage:** Proforma / invoice PDFs default to `./var/billing-pdfs` on the API machine. On **Hetzner**, use **[Object Storage](https://docs.hetzner.com/storage/object-storage/overview/)** (S3-compatible): set `S3_BILLING_BUCKET`, `S3_ENDPOINT` (e.g. `https://fsn1.your-objectstorage.com`), `S3_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` — see `.env.example` for optional `S3_FORCE_PATH_STYLE` (MinIO).
- **Email:** Worker can send **`proforma_issued` / `invoice_issued`** via **Resend** when `RESEND_API_KEY` is set; billing links use `BILLING_EMAIL_DASHBOARD_ORIGIN` or `NEXT_PUBLIC_APP_URL`.

## Integration proof

With **Docker**, **`.env`**, **`pnpm db:push`**, and **API + worker** running:

| Check            | How                                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| Nest aggregation | `GET http://localhost:4000/api/integration` — Postgres, Redis, BullMQ enqueue, Sanity (`skipped` if no project id). |
| CLI smoke        | `pnpm integration:check` (API must be up). `STRICT=1` exits non-zero if any check is `down`.                        |
| Web → API        | `GET /api/integration` (Next route) proxies the same JSON.                                                          |
| Locales          | Open **`/integration`** (default `sr`) and **`/en/integration`** — UI strings from `messages/*`.                    |
| BullMQ           | Hitting Nest `/api/integration` adds job `integration-ping`; **worker** logs `integration_ping_job` (JSON line).    |
| Legacy hello     | `GET /api/hello` on web still calls Nest `GET /api`.                                                                |

## Common commands

| Command                                                       | Purpose                                                                                  |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `pnpm dev:all`                                                | Run web + api + worker + cms together (`concurrently`)                                   |
| `pnpm dev:web` / `dev:api` / `dev:worker` / `dev:cms`         | Single app                                                                               |
| `pnpm start:web`                                              | Production Next server (after `pnpm build:web`)                                          |
| `pnpm build`                                                  | Build all apps with a `build` target                                                     |
| `pnpm build:web` / `build:api` / `build:worker` / `build:cms` | One app                                                                                  |
| `pnpm lint`                                                   | ESLint all projects                                                                      |
| `pnpm lint:web` / `lint:api` / …                              | One project                                                                              |
| `pnpm format` / `pnpm format:write`                           | Prettier check / fix                                                                     |
| `pnpm typecheck`                                              | Typecheck where `typecheck` target exists                                                |
| `pnpm test`                                                   | Tests (Nx; excludes api/worker until test targets exist)                                 |
| `pnpm graph`                                                  | Nx project graph                                                                         |
| `pnpm clean`                                                  | `nx reset` (clear local Nx cache)                                                        |
| `pnpm db:generate`                                            | Drizzle: generate SQL migrations from schema                                             |
| `pnpm db:push`                                                | Drizzle: push schema to DB (dev-friendly)                                                |
| `pnpm db:migrate`                                             | Drizzle: apply `drizzle/` migrations (needs `DATABASE_URL`; includes core domain tables) |
| `pnpm db:studio`                                              | Drizzle Studio                                                                           |
| `pnpm db:seed`                                                | Runs **all** seeders (`db:seed:all`)                                                     |
| `pnpm db:seed:all`                                            | RS locations, then domain baseline (users, company, sample job)                          |
| `pnpm db:seed:rs`                                             | Curated RS districts + cities/municipalities (JSON, no external API)                     |
| `pnpm db:seed:domain`                                         | Dev users + company + sample job (`seed-domain-baseline.sql`)                            |
| `pnpm cms:seed`                                               | Seed baseline Sanity documents for web CMS rendering                                     |
| `pnpm docker:up` / `docker:down` / `docker:logs`              | Compose Postgres + Redis                                                                 |
| `pnpm integration:check`                                      | HTTP GET `/api/integration` (see section above)                                          |

## Repository description (GitHub, under 350 characters)

> Šljakam — modern hiring platform monorepo: Next.js, NestJS, Nx, TypeScript. Fast job discovery, employer branding, scalable workflows, search, alerts. Private.
