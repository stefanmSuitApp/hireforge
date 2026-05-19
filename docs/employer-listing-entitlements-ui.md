# Employer listing form — entitlement-driven fields (SSOT alignment)

This documents which package entitlements surface in the employer draft UI/API as of the entitlement-driven form work.

## Implemented mapping (SSOT §6.3)

| Entitlement                                        | UI / API behavior                                                                                                                                                                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `editor`, `max_characters`, `hyperlinks_max_count` | TipTap capabilities, character budget, link rules ([`JobDescriptionEditor`](../../libs/ui/src/lib/job-description-editor.tsx), [`validateJobDraftAgainstEntitlements`](../../libs/server/jobs/src/lib/entitlements-draft.ts)). |
| `max_cities`                                       | City required when not `unlimited`; optional when `unlimited`. Single `city_id` on `jobs` (see [multi-city note](refactor/MULTI_CITY_JOBS.md)).                                                                                |
| `featured_listing`                                 | Optional **Featured listing** toggle on draft form; persisted on `jobs.featured`; API rejects if `true` without entitlement.                                                                                                   |
| `crossborder_visible`                              | Optional **Visible outside Serbia** toggle; persisted on `jobs.crossborder_visible`; gated by entitlement.                                                                                                                     |
| `png_creative`                                     | Optional **Listing creative image URL** (`https://` only); persisted on `jobs.png_creative_url`; gated by entitlement.                                                                                                         |

## Deferred (see [`docs/refactor/MIGRATION_PLAN.md`](refactor/MIGRATION_PLAN.md) Step 11)

- Multipart image upload pipeline, EXIF strip, AVIF storage (§11.6).
- Autosave debounce (§11.7).
- Full locked-toolbar upgrade modal copy (§11.3); disallowed tools remain unavailable in the editor.

## Apply rules

`applyMode` / `externalApplyUrl` are not entitlement-gated in SSOT §6.3; they remain available for all packages that can author listings.
