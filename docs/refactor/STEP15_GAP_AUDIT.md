# Step 15 — Gap audit (implementation baseline)

Cross-check of [`MIGRATION_PLAN.md`](./MIGRATION_PLAN.md) §15 against the repo **before** this Step 15 implementation pass.

## Already present

| Area | Location | Notes |
|------|-----------|--------|
| Locale prefix | [`apps/web/src/i18n/routing.ts`](../../apps/web/src/i18n/routing.ts) | `localePrefix: 'always'`, `defaultLocale: 'sr'`. |
| Canonical alternates helper | [`apps/web/src/i18n/metadata.ts`](../../apps/web/src/i18n/metadata.ts) | `buildLocaleAlternates` → `canonical` + `languages` per locale. |
| Jobs list + filters | [`apps/web/src/features/jobs`](../../apps/web/src/features/jobs) | Server-fed list, `JobsFilterForm`, taxonomy from `GET public/jobs/filters`. |
| Job detail + slug | [`apps/web/src/app/[locale]/jobs/[jobRef]/page.tsx`](../../apps/web/src/app/[locale]/jobs/[jobRef]/page.tsx) | UUID or slug fetch via Nest. |
| Company page + CMS branding | [`apps/web/src/features/companies/components/public-company-page.tsx`](../../apps/web/src/features/companies/components/public-company-page.tsx) | Basic header + jobs list; not yet full Glassdoor snapshot + shared chip rail. |
| Glassdoor-style excerpt | List API | `PublicJobListItem.excerpt` exists; list UI did not surface excerpt on cards (aligned with §15.4). |
| External apply telemetry | `POST public/jobs/:id/external-click` | Wired from `JobListingPreview`. |

## Gaps closed in this pass

- **Two-column jobs discovery + `job` query selection** — desktop preview pane; mobile keeps `/jobs/[jobRef]`.
- **Sticky filter chips + extended list query** — `workModel`, `employmentType`, `postedWithin`, `easyApply` (salary filters omitted: **no salary columns on `jobs`** yet).
- **Similar jobs API + UI** — `GET public/jobs/:id/similar`.
- **Saved jobs + saved searches** — `saved_jobs`, `saved_job_searches` tables; candidate Nest routes + Next BFF.
- **Job previews batch** — `GET public/jobs/previews` for home strips / recently viewed.
- **Home hero search + strips** — wired to jobs URL params; recently viewed via **localStorage** + previews endpoint; popular uses list API.
- **hreflang `x-default`**, **sitemap**, **root `Accept-Language` redirect**.
- **i18n key parity test** — `sr.json` vs `en.json`.
- **CMS bilingual validation** — critical document types require both `sr` and `en` locale blocks where applicable.

## Intentional deferrals / follow-ups

| Item | Reason |
|------|--------|
| Salary range chip & “salary disclosed” | No salary fields on `jobs` in Drizzle schema; add when product ships compensation disclosure. |
| Playwright slug redirect spec | No Playwright setup in repo yet; redirect behaviour remains covered by Next route + manual smoke. |
| Lighthouse ≥ 95 CI | Not wired as automated gate; run manually per verification checklist. |
