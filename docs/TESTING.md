# Testing

How Šljakam / hireforge is tested: the layers, the commands, the registries
that make "every route / table / file has tests" a rule the build enforces,
and where each suite runs. Modelled on autofind `docs/TESTING.md`. Plan and
history: [`docs/plans/TEST_COVERAGE.md`](./plans/TEST_COVERAGE.md).

## Rules

1. **Behaviour sentences as test names:** `an employer of another company gets
404 for a job's applications`.
2. **Prove the test catches its bug:** run it once against the old code (or
   with a deliberate fault) and see it fail. The plan's log records how.
3. **Real infrastructure where it matters:** locking, numbering, migrations,
   search, the outbox and rate limits run on real Postgres and Redis
   (Testcontainers), never mocks.
4. **Deterministic:** fixed clock (`FIXED_NOW` / `useFixedClock()`, `E2E_NOW`
   overrides), `Europe/Belgrade`, no retries, third parties stubbed (Resend,
   NBS, Sanity). A flaky test is a bug.
5. **Known bugs are `it.fails`**, named after what should be true, with a
   `PROGRESS.md` "Known issues" line. Fixing the bug turns the test red, so
   it gets flipped to `it` in the same change.

## Layers

| Layer           | Tool                                                      | Where                                                     | Command                                        |
| --------------- | --------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------- |
| Static          | tsc, ESLint (+ Nx module boundaries), Prettier            | every project                                             | `pnpm lint` · `pnpm typecheck` · `pnpm format` |
| Unit            | Vitest                                                    | `libs/*`, `apps/web` (node + jsdom)                       | `pnpm test`                                    |
| Coverage gate   | `@vitest/coverage-v8`, ≥ 90 % lines and branches per file | dense logic only (below)                                  | part of `pnpm test`                            |
| Component       | Vitest + Testing Library (jsdom)                          | apply form, checkout + promo, CV wizard, sign-in redirect | part of `pnpm test`                            |
| Database        | Vitest + Testcontainers Postgres                          | `libs/database`                                           | `pnpm test:integration`                        |
| API integration | Vitest + Nest `AppModule` + supertest                     | `apps/api`                                                | `pnpm test:integration`                        |
| Jobs            | Vitest + real BullMQ/Redis + the built worker             | `apps/worker`                                             | `pnpm test:integration`                        |
| E2E             | Playwright                                                | `e2e/`                                                    | `pnpm e2e`                                     |

## Shared harness (`libs/testing`)

- **Presets** (`libs/testing/src/vitest/preset.ts`): every `vitest.config.mts`
  calls `unitConfig(import.meta.url, { coverage? })` and every
  `vitest.integration.config.mts` calls `integrationConfig(import.meta.url,
{ nest? })`. Unit configs exclude `*.int.test.ts`, so `pnpm test` needs no
  Docker. `nest: true` adds SWC for Nest's decorator metadata.
- **Containers:** one Postgres 16 + one Redis 7 per run (random ports, same
  images as `docker-compose.yml`), so two runs never share anything. A run
  that exits non-zero prints `[integration] vitest exiting with code N while
<phase>`.
- **Database per file:** a template migrated once by the real
  `scripts/db/migrate.mjs`, seeded with `pnpm db:seed:rs` and the reference
  data of the dev seed (cities, categories, packages, prices, entitlements;
  never its users). Each test file gets `CREATE DATABASE … TEMPLATE` and its
  own Redis DB index; `DATABASE_URL` / `REDIS_URL` point at them, and
  Resend, Sanity, S3 and dev headers are unset.
- **Factories** (`testing/db`): `insertCompany`, `insertEmployer`,
  `insertCandidate`, `insertModerator({ pipeline })`, `insertAdmin`,
  `insertSubscription`, `insertProforma`, `insertJob({ status })`,
  `insertApplication`, `insertResume`, `insertSavedJob/Search`,
  `insertJoinRequest`, `insertPromoCode`, `insertOutboxEvent`. Every user's
  password is `TEST_PASSWORD`. `COMPANY_A` / `COMPANY_B` have look-alike names,
  slugs, PIB and MB on purpose.
- **Stubs** (`testing`): `startResendStub()` (dedupes by `Idempotency-Key`
  like Resend), `startNbsStub()`, `fakeSanityClient()`, `startStubServer()`;
  `pdfText()` (`testing/pdf`) extracts the text of a generated PDF.
- **API** (`apps/api/src/__harness__`): `startApp()` boots the real
  `AppModule` + `configureApp()` (the same as `main.ts`), `signIn()` goes
  through the real login route of each role, `signInAs(role)` seeds and signs
  in, `seedNbsRate()` fills the NBS cache so nothing calls the real NBS.
- **Query plans:** `explain()`, `usesIndex()`, `seqScans()`; the plan tests
  capture the SQL the API really sends from the pg driver.

## Registries (a new thing without tests fails the build)

- **Routes** (`apps/api/src/__harness__/routes.ts`): every route the API serves
  is `PUBLIC` (with a reason), `SESSION`, role-restricted or token-protected.
  `route-registry.int.test.ts` fails if a served route is missing or a listed
  one is gone, if a route's guards don't match its entry, and runs the role
  matrix: every route × anonymous / candidate / employer / moderator / admin,
  also asserting no request ever gets a 5xx.
- **Company isolation** (`company-isolation.int.test.ts`,
  `__harness__/isolation.ts`): for every resource a company, candidate or
  moderator owns, the other party gets 404 (or 403 where documented) for list
  / read / change, also with the owner's ids forged in query, header and body,
  the row stays unchanged, and positive controls prove the owner still can.
- **BFF parity** (`bff-parity.int.test.ts`): every
  `apps/web/src/app/api/**/route.ts` calls only Nest routes in the registry.
- **Schema** (`libs/database/src/schema-drift.int.test.ts`): `schema.ts` and the
  migrated database have the same tables, columns (type, nullability,
  default), indexes, CHECKs and foreign keys, both ways.

## Coverage gate

`pnpm test` fails when any listed file drops under 90 % lines or branches:

- `libs/contracts`: billing numbers, CV profile, packages, promo maths and
  schemas, plain-text length, public query, subscriptions;
- `libs/server/jobs`: entitlements, external apply URL, description HTML
  sanitizer (XSS cases), slugs, trivial patch;
- `libs/server/billing`: NBS middle rate;
- `libs/server/email`: all templates (sr / en);
- `libs/server/pdf`: the billing PDF; `libs/server/cms-sync`: the Sanity mapper;
- `libs/server/applications`, `libs/server/auth`, `libs/shared` helpers.

Code that talks to Postgres or Redis is covered by the integration suites,
and UI by behaviour tests, not by a number.

## Where each suite runs

|                                                   | Pull request                 | `main`                          | Locally                                                  |
| ------------------------------------------------- | ---------------------------- | ------------------------------- | -------------------------------------------------------- |
| lint, format, typecheck, unit (+ coverage), build | ✅ `ci.yml`                  | ✅                              | before every push                                        |
| integration (`pnpm test:integration`)             | —                            | ✅ `integration.yml` (+ manual) | before pushing api / database / worker / testing changes |
| e2e (`pnpm e2e`)                                  | ✅ (kept, Stefan 2026-10-28) | ✅                              | before pushing web changes                               |

`pnpm test:integration` needs Docker (OrbStack is fine) and takes about
75 s. `apps/api` and `apps/worker` build first: their boot tests run the built
`dist/*/main.js`, as the images do.
