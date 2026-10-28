# Plan — SEO for Šljakam + quality gates

Branch `feat/seo-quality-gates`, cut from `main` at `a9ef74a` on 2026-10-28.
Written before implementation; the implementing agent ticks items off here and
records what it skipped and why. **Not to be merged or deployed until Phase C
(see `PROGRESS.md`) is merged into `main`.**

## Goal

Make sljakam.com as findable as a Serbian job board can be: jobs, companies,
cities and categories indexed by Google (incl. Google for Jobs), Bing and the
rest. Add the quality gates ported from autofind-platform, with the
design/visual/performance ones **warning only**: they never block a commit, a
push or a deploy.

Rules for this work:

- Don't repeat anything Phases A, B or C already deliver. Re-check `main` and
  `PROGRESS.md` before each workstream and again after the final rebase.
- No new heavy jobs on pull requests (GitHub minutes cost money). Cheap steps
  (under ~30 s) may join the existing `checks` job. Everything heavier runs on
  deployment / push to `main` only.
- Every user-facing string goes through `next-intl`, in both `sr` and `en`.
- No invented facts or copy. Leave `TODO(Stefan)`, and list anything that
  needs Stefan (accounts, tokens, verification codes) in `NEEDS_STEFAN.md`.

## Decision taken without Stefan (reversible): public job pages

Today `/jobs`, `/jobs/[jobRef]` and `/employers` redirect anonymous visitors to
`/sign-in` (decision of 2026-10-27). That makes job SEO impossible: Google
won't index a page it can't see, and Google for Jobs requires the posting page
to show the job. `sitemap.xml` also currently lists `/jobs` and `/employers`,
which only redirect.

On 2026-10-28 Stefan asked to "max out SEO, this site needs to be
reachable", so this branch takes the middle ground noted at handoff:

- **Public read-only:** job list, job detail and the employers/companies pages
  are visible without login. They show title, company, location, work model,
  employment type, salary (if Phase C added it), description and posted/expiry
  dates.
- **Still behind login:** apply, save job, any employer contact details that
  aren't part of the public description, and everything under
  candidate/employer/moderator/admin.
- **One switch:** env `PUBLIC_JOBS` (default `true`). With `false` the old wall
  comes back, and JSON-LD, job sitemaps and indexing pings switch off with it.
  Documented in `NEEDS_STEFAN.md` as "confirm or flip".

## Workstream 1 — Technical SEO foundations

1. **Public jobs** behind `PUBLIC_JOBS` (above). Move the gate from the
   pages/middleware to the apply/save actions. Logged-out CTA: "Sign in to
   apply", with `returnTo`.
2. **robots.ts:** allow public pages. Disallow `/api/`,
   `/*/candidate/`, `/*/employer/`, `/*/moderator/`, `/*/admin/`,
   `/*/jobs/*/apply`, `/*/integration`. Point to the sitemap index. Disallow
   everything on non-production hosts (any origin other than the production
   `NEXT_PUBLIC_APP_URL`).
3. **Sitemaps:** a sitemap index with:
   - static pages per locale;
   - live jobs only (published, not expired), with `lastmod`;
   - companies with at least one live job;
   - CMS pages (`/p/[slug]`, about);
   - city / category landing pages that have at least one live job.

   Every entry carries hreflang alternates `sr`, `en` and `x-default`. Split
   with `generateSitemaps` past 5 000 URLs. Drop `/sign-in` and any URL that
   redirects or is noindex.

4. **Metadata everywhere public:** a unique localized `title` and
   `description`, a self-referencing canonical, hreflang (extend the existing
   `buildLocaleAlternates`), OG and Twitter tags.
   - `noindex,follow` on sign-in/register pages, filtered or sorted list
     permutations that aren't landing pages, empty result pages, and expired
     jobs.
   - Search-filter URLs canonicalize to their clean landing page where one
     exists. Paginated pages stay self-canonical and crawlable through real
     `<a href>` links.
5. **Brand spelling:** people type "sljakam" without the diacritic. Use
   `Šljakam` in visible copy, and add `Sljakam`, `sljakam.com` and `Šljakam`
   as Organization `alternateName`. Make sure "Sljakam" appears on the home
   page and in metadata at least once.
6. **Status codes:** missing job, company or page → real 404 via
   `notFound()`, not a 200 "not found" page. Old job slugs (editing drops the
   slug, a known issue) → 301 to the current canonical slug, via a slug history
   or a stable id in the URL.
7. **Hosts:** `www.sljakam.com` → 301 to `https://sljakam.com`, keeping the
   path. Caddy: check first whether Phase C already did this, since Phase C
   edits Caddy for HSTS/CSP; merge with it, don't overwrite. `/` currently
   redirects by Accept-Language. Keep it, but make sure crawlers without the
   header land on `sr` and that `x-default` points there.
8. **`<html lang>`** set per locale. One `<h1>` per page and sane heading
   order on public pages. Meaningful `alt` on images.
9. **Rendering and speed:** public pages are server-rendered with content in
   the initial HTML. Use ISR/`revalidate` for list, detail, company and
   landing pages, and revalidate on job publish/expire if cheap. Use
   `next/image` and `next/font`. No layout shift from late banners.

## Workstream 2 — Structured data (JSON-LD, typed with `schema-dts`)

1. **Site-wide:** `Organization` (name, alternateName, url, logo, sameAs →
   `TODO(Stefan)` socials) and `WebSite`.
2. **Job detail:** `JobPosting` following Google's current required and
   recommended properties: `title`, `description` (HTML), `datePosted`,
   `validThrough`, `employmentType`, `hiringOrganization` (name, sameAs, logo),
   `jobLocation` / `applicantLocationRequirements` + `jobLocationType:
TELECOMMUTE` for remote, `baseSalary` when present, `identifier`, and
   `directApply` true when apply mode is internal. Not emitted for expired or
   unpublished jobs, or when `PUBLIC_JOBS=false`.
3. **`BreadcrumbList`** on job, company and landing pages.
4. **Company page:** `Organization` with the company's own data.
5. **Unit tests** for every builder: required fields, no `undefined` leaking
   out, expired → no JobPosting. Plus an e2e assertion that the JSON-LD on a
   real page parses and matches the visible title.

## Workstream 3 — Content surface (programmatic landing pages)

1. **City, category and city × category pages**, following
   `docs/refactor/STEP15_URL_CONTRACT.md`. Take the slugs from the taxonomy /
   RS locations data; don't invent new ones. Each page gets a unique
   title/H1/intro from i18n templates, the live job list, internal links to
   neighbouring cities/categories, and breadcrumbs.
   - Index only with ≥ 1 live job; otherwise `noindex` and leave it out of the
     sitemap.
   - Check the slug transliteration (`đ` → `dj`) used in these URLs.
2. **Internal linking:** a footer and home page block with top cities and
   categories, "related jobs" on job detail, and "other jobs by this company".
3. **Expired job page:** stays reachable with an "ad expired" banner and links
   to similar live jobs. It's `noindex` and has no JobPosting.

## Workstream 4 — Discovery integrations (env-gated, no-op when unset)

1. **Search engine verification:** `GOOGLE_SITE_VERIFICATION`,
   `BING_SITE_VERIFICATION` and `YANDEX_SITE_VERIFICATION` feed into Next
   `metadata.verification`. Values → `NEEDS_STEFAN.md`.
2. **IndexNow (Bing, Yandex, Seznam, Naver):** a key file served at
   `/<INDEXNOW_KEY>.txt`. The worker pings on job published / updated /
   expired outbox events, batched and with retries. It never blocks the
   outbox, and failures are logged and dropped.
3. **Google Indexing API (officially supported for JobPosting pages):** the
   worker sends `URL_UPDATED` / `URL_DELETED` on the same events, using a
   service account from env (`GOOGLE_INDEXING_SA_JSON`, base64). The account
   and Search Console ownership → `NEEDS_STEFAN.md`.
4. **Web app manifest (`manifest.ts`), icons and theme colour**, for an
   installable PWA-lite and correct icons in results.
5. **`/llms.txt`:** a short plain description of the site and its public
   sections. Cheap; skip if it fights the routing.
6. **No analytics or tracking scripts in this branch.** Cookie consent and
   legal pages belong to Phase C. List the "GA4 vs cookieless analytics"
   choice in `NEEDS_STEFAN.md`.

## Workstream 5 — Quality gates (from autofind-platform, adapted)

Blocking (pre-push + CI `checks` job, all cheap):

1. **Merged-migration guard:** a test comparing `drizzle/` with `origin/main`.
   Files already on `main` must be byte-identical, including
   `drizzle/meta/_journal.json` entries for existing migrations; new files are
   allowed. CI needs `origin/main` fetched (see autofind `checks.yml`, "Fetch
   main for the migration check").
2. **`check:i18n`:** fails on hard-coded JSX text and text attributes
   (`aria-label`, `placeholder`, `title`, `alt`, `label`), and when `sr.json`
   and `en.json` keys differ. Port autofind `scripts/check-i18n.mjs`. Fix the
   existing hits. If there are too many, ship an allowlist file that only
   shrinks.
3. **Husky:** `pre-commit` runs lint-staged (eslint --fix, prettier on staged
   files). `pre-push` runs `lint + typecheck + test + check:i18n + migration
guard` (blocking), then the warn-only checks below (never block). Keep it
   fast; full e2e is not in the hook.
4. **api/worker unit tests run:** remove `--exclude=api,worker` from
   `pnpm test`. They have no test target today. Add a vitest config with
   `passWithNoTests`, and at least one real test each (e.g. the outbox
   dispatcher, the env guard).
5. **axe in e2e:** an `expectNoA11yViolations(page)` helper (WCAG 2 A/AA tags)
   used on every public page and the main logged-in screens. It is blocking
   because it runs inside the existing e2e job. Fix what it finds, or list
   specific rule IDs to skip with a reason.

Warning only (print `::warning::` on CI, exit 0, never gate anything):

6. **Design tokens:** `global.css` already has shadcn-style CSS variables and a
   `.dark` variant. Formalize them as the token source of truth. `check:design`
   reports raw hex/rgb/arbitrary Tailwind colour and size values outside the
   token file. `check:contrast` checks token pairs in light and dark against
   WCAG. No mass refactor of components in this branch.
7. **Visual baselines:** Playwright `toHaveScreenshot` on key public screens
   (home, jobs list, job detail, company, a landing page, sign-in) at 375 and
   1440 px, light (+ dark if the UI supports it). Baselines are generated on
   Linux in the official Playwright Docker image. A separate config/project
   (`e2e:visual`) keeps it out of the blocking e2e run. A `workflow_dispatch`
   "update screenshots" workflow updates them, like autofind.
8. **Lighthouse:** `lighthouse` against a production build (local) and against
   the live site after deploy. Budgets live in `scripts/perf-budgets.json`:
   SEO 100, accessibility ≥ 95, best practices ≥ 95, performance target set
   from the first measured run. CI margins as in autofind
   `lighthouse-budgets.mjs`. Report only.
9. **`seo:audit <baseUrl>`:** a script that fetches `robots.txt` and the
   sitemap index, samples URLs and asserts 200 status, canonical, hreflang
   pairs, no accidental `noindex`, parseable JSON-LD, title/description
   length, and the www → apex redirect. Report only. Runs locally and after
   every deploy.

Where the warn-only checks run: on deployment only. If Phase C added a
deploy/image workflow, add a `continue-on-error: true` job there. Otherwise add
`quality-report.yml` on `push` to `main` + `workflow_dispatch` (with
`paths-ignore` for docs and a timeout). The post-deploy step runs `seo:audit`
and Lighthouse against `https://sljakam.com`. **Never on `pull_request`.**

## Workstream 6 — Playwright, the autofind way (adapted)

Port the useful parts of `autofind-platform/apps/web-e2e`, keeping `e2e/` and
`scripts/e2e/run.mjs` as the entry points:

- **Parallel-safe stacks:** ports, e2e DB name and Redis DB index come from env
  (`E2E_API_PORT`, `E2E_WEB_PORT`, `E2E_DB_NAME`, `E2E_REDIS_DB`), with today's
  values as defaults. Two checkouts on one machine must not collide.
- **Shared fixtures:** a fixed clock (`E2E_NOW`) so dates and screenshots are
  stable, a theme fixture, and the axe helper.
- **Projects** per width (375 mobile first, 1440) for the visual suite.
- **Linux snapshot path template:** baselines committed for Linux only, plus
  `e2e:visual:update` locally via Docker.
- **New specs that click like a person:**
  - logged-out visitor browses jobs → opens a job → clicks apply → lands on
    sign-in with `returnTo` → signs in → reaches apply;
  - `robots.txt` / `sitemap.xml` content;
  - JSON-LD on job detail;
  - landing page lists the right jobs;
  - expired job is noindex;
  - www redirect is covered by `seo:audit`, not e2e.

  Each new spec must be shown failing without its fix.

## Order of work

1. Parallel-safe e2e (Workstream 6, first bullet).
2. Quality gates 1–5.
3. Public jobs + technical SEO.
4. Structured data.
5. Landing pages + internal links.
6. Discovery integrations.
7. Warn-only gates 6–9 + deploy wiring.
8. Docs.

One commit per coherent step (conventional commits), each with the full repo
check green.

## Done means

- `pnpm lint && pnpm format && pnpm typecheck && pnpm test && pnpm build && pnpm e2e`
  all green from the repo root.
- Warn-only checks run and produce a report, even when they warn.
- Rebased on `main` after Phase C merged, conflicts resolved keeping Phase
  A/B/C behaviour and this branch's.
- PR merged, deployed, verified on https://sljakam.com:
  - an anonymous job page renders;
  - `robots.txt` and `sitemap.xml` are correct;
  - the Rich Results structure validates (via `seo:audit` JSON-LD checks);
  - `seo:audit` and Lighthouse reports attached in `PROGRESS.md`.
- `PROGRESS.md` updated (new section). `NEEDS_STEFAN.md` lists every token,
  account and decision waiting on Stefan.

## Implementation log

Ticked as each step lands on the branch. Skipped items say why.

- [x] W6 · Parallel-safe e2e stacks: `E2E_DB_NAME`, `E2E_REDIS_DB`,
      `E2E_API_PORT`, `E2E_WEB_PORT` (defaults unchanged; documented in
      `.env.example`).
