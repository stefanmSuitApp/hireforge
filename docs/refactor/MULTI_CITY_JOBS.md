# Multi-city jobs (deferred)

## Current model

- `jobs.city_id` is a **single nullable FK** to `cities`.
- `EntitlementsBlob.max_cities` can be `3`, `unlimited`, etc. per package (SSOT §6.3).
- Validation today enforces “at least one city when `max_cities !== 'unlimited'`”, not “exactly N cities”.

## Why UI does not offer multiple city pickers yet

Supporting `max_cities > 1` requires:

1. **Schema**: e.g. `job_locations(job_id, city_id, sort_order)` (unique `(job_id, city_id)`) or JSONB array with validated city IDs.
2. **API**: `EmployerJobDraftBody` accepts an ordered list of city slugs/IDs; `validateJobDraftAgainstEntitlements` checks `slugs.length` vs `max_cities` (and `unlimited`).
3. **Public / search**: Ranking and filters must use the junction (FTS and filters currently assume one city).
4. **CMS / migrations**: Backfill strategy for existing rows (single location → one junction row).

Until that ships, employers see **one** city control; packages with higher `max_cities` still comply by picking a **primary** location while product decides whether to prioritize the schema milestone.
